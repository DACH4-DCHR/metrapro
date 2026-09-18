// Metrado de materiales: convierte las partidas técnicas del cuadro de metrados
// (m³ de concreto, m² de encofrado, kg de acero) en materiales concretos que se
// pueden comprar en ferretería — pensado para armar una lista simple que se pueda
// enviar al cliente. El acero y el ladrillo/mortero ya vienen calculados en el
// metrado; lo único que se deriva aquí es cemento/arena/piedra/agua a partir del
// volumen de concreto, usando una dosificación referencial por f'c.
import type { MetradoLine, AceroItem } from "./types";
import { resumirAceroPorDiametro, type AceroResumenItem } from "./calc/aceroResumen";

// Bolsas de cemento (42.5 kg), arena gruesa, piedra chancada y agua por cada m³
// de concreto SIMPLE (sin piedra grande/mediana desplazadora). Son valores
// referenciales de la práctica peruana — ajusta según tu diseño de mezcla real.
const DOSIFICACION_POR_FC: Record<number, { cementoBolsas: number; arenaM3: number; piedraM3: number; aguaM3: number }> = {
  140: { cementoBolsas: 6.4, arenaM3: 0.53, piedraM3: 0.79, aguaM3: 0.184 },
  175: { cementoBolsas: 7.6, arenaM3: 0.51, piedraM3: 0.75, aguaM3: 0.184 },
  210: { cementoBolsas: 9.2, arenaM3: 0.48, piedraM3: 0.72, aguaM3: 0.186 },
};

export interface MaterialesResumen {
  cementoBolsas: number;
  arenaM3: number;
  piedraM3: number;
  aguaM3: number;
  ladrillos: { tipo: string; cantidad: number }[];
  morteroM3: number;
  acero: AceroResumenItem[];
  totalVarillas: number;
  fcNoReconocidos: number[];
}

// Extrae el f'c y, si es concreto ciclópeo, el % de piedra grande/mediana que
// desplaza (para no aplicarle dosificación de cemento a ese volumen de piedra).
function volumenEfectivoConcreto(partida: string, cantidad: number): { fc: number; volumen: number } | null {
  const fcMatch = partida.match(/f'?c\s*=\s*(\d+)/i);
  if (!fcMatch) return null;
  const stoneMatch = partida.match(/\+\s*(\d+)\s*%\s*P\.[GM]\./i);
  const stonePct = stoneMatch ? Number(stoneMatch[1]) : 0;
  return { fc: Number(fcMatch[1]), volumen: cantidad * (1 - stonePct / 100) };
}

export function calcularMetradoMateriales(
  consolidated: MetradoLine[],
  elements: { steelByDiameter?: AceroItem[] }[]
): MaterialesResumen {
  let cementoBolsas = 0;
  let arenaM3 = 0;
  let piedraM3 = 0;
  let aguaM3 = 0;
  const fcNoReconocidos = new Set<number>();

  for (const line of consolidated) {
    if (line.unidad !== "m³" || !/concreto/i.test(line.partida)) continue;
    const efectivo = volumenEfectivoConcreto(line.partida, line.cantidad);
    if (!efectivo) continue;
    const dosificacion = DOSIFICACION_POR_FC[efectivo.fc];
    if (!dosificacion) {
      fcNoReconocidos.add(efectivo.fc);
      continue;
    }
    cementoBolsas += efectivo.volumen * dosificacion.cementoBolsas;
    arenaM3 += efectivo.volumen * dosificacion.arenaM3;
    piedraM3 += efectivo.volumen * dosificacion.piedraM3;
    aguaM3 += efectivo.volumen * dosificacion.aguaM3;
  }

  const ladrillos = consolidated
    .filter((l) => l.unidad === "und" && /ladrillo/i.test(l.partida))
    .map((l) => ({ tipo: l.partida, cantidad: l.cantidad }));

  const morteroM3 = consolidated
    .filter((l) => l.unidad === "m³" && /mortero/i.test(l.partida))
    .reduce((acc, l) => acc + l.cantidad, 0);

  const acero = resumirAceroPorDiametro(elements.flatMap((e) => e.steelByDiameter ?? []));
  const totalVarillas = acero.reduce((acc, r) => acc + r.numeroVarillas, 0);

  return {
    cementoBolsas,
    arenaM3,
    piedraM3,
    aguaM3,
    ladrillos,
    morteroM3,
    acero,
    totalVarillas,
    fcNoReconocidos: Array.from(fcNoReconocidos),
  };
}

// Aplana el resumen a líneas de metrado (mismo shape que el resto de la app), SIN
// el acero — el acero tiene su propia tabla por diámetro (ver aceroALineas) para
// que se note claramente la cantidad de varillas por diámetro, en vez de perderse
// como una fila más entre cemento/arena/piedra.
export function materialesALineas(materiales: MaterialesResumen): MetradoLine[] {
  return [
    { partida: "Cemento Portland Tipo I (bolsa 42.5 kg)", unidad: "bolsas", cantidad: materiales.cementoBolsas },
    { partida: "Arena gruesa", unidad: "m³", cantidad: materiales.arenaM3 },
    { partida: "Piedra chancada", unidad: "m³", cantidad: materiales.piedraM3 },
    { partida: "Agua", unidad: "m³", cantidad: materiales.aguaM3 },
    ...(materiales.morteroM3 > 0 ? [{ partida: "Mortero para asentado (preparado)", unidad: "m³", cantidad: materiales.morteroM3 }] : []),
    ...materiales.ladrillos.map((l) => ({ partida: l.tipo, unidad: "und", cantidad: l.cantidad })),
  ];
}

// Una línea de metrado por diámetro de acero (peso en kg, que es como se cotiza
// comercialmente); el número de varillas comerciales se muestra aparte (ver
// AceroResumenItem.numeroVarillas), no como otra fila valorizada, para no tener
// que inventarle un precio "por varilla" distinto al precio por kg.
export function aceroALineas(materiales: MaterialesResumen): MetradoLine[] {
  return materiales.acero.map((r) => ({ partida: `Acero corrugado Ø ${r.symbol}`, unidad: "kg", cantidad: r.pesoKg }));
}

// Material agregado manualmente por el usuario (no derivado del metrado), para
// completar la lista de compra con cosas como clavos, alambre, madera, etc.
// Se persiste en el proyecto (setMaterialesCustom) igual que los precios.
export interface CustomMaterialLine {
  id: string;
  partida: string;
  unidad: string;
  cantidad: number;
}

export function customMaterialesALineas(items: CustomMaterialLine[]): MetradoLine[] {
  return items.map((i) => ({ partida: i.partida, unidad: i.unidad, cantidad: i.cantidad }));
}
