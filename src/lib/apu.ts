// Análisis de Precios Unitarios (APU): desglosa el precio de una partida en
// materiales + mano de obra + equipos/herramientas, en vez de un solo número
// escrito a mano. De acá sale el reparto REAL mano de obra/materiales de una
// partida puntual (hoy el Dashboard solo tiene un % referencial por
// categoría, ver dashboardCharts.ts).
//
// Los jornales y rendimientos de las plantillas por defecto (más abajo) son
// valores REFERENCIALES de la práctica peruana — igual criterio que la
// dosificación de concreto en materiales.ts: ajústalos al convenio colectivo
// vigente (CAPECO/FTCCP) y a tu rendimiento real antes de usarlos en un
// entregable final. Toda partida acepta un APU editado a mano que reemplaza
// esta plantilla (ver ApuOverrides).
export type CategoriaManoObra = "Operario" | "Oficial" | "Peón";

export interface ApuMaterialItem {
  insumo: string;
  unidad: string;
  cantidad: number; // por unidad de la partida (ej. por m², por m³)
  precio: number; // S/. por unidad del insumo
}

export interface ApuManoObraItem {
  categoria: CategoriaManoObra;
  cuadrilla: number; // cantidad de esa categoría en la cuadrilla
  rendimiento: number; // unidades de partida por día, de toda la cuadrilla
  jornal: number; // S/. por día, de esa categoría
}

export interface ApuEquipoItem {
  insumo: string;
  // Directo (cantidad × precio) o herramientas menores como % de mano de obra.
  cantidad?: number;
  precio?: number;
  pctManoObra?: number; // ej. 0.03 = 3% de mano de obra
}

export interface ApuDef {
  materiales: ApuMaterialItem[];
  manoObra: ApuManoObraItem[];
  equipos: ApuEquipoItem[];
}

export interface ApuTotales {
  materiales: number;
  manoObra: number;
  equipos: number;
  total: number;
}

export function calcularApu(apu: ApuDef): ApuTotales {
  const materiales = apu.materiales.reduce((acc, m) => acc + m.cantidad * m.precio, 0);
  const manoObra = apu.manoObra.reduce(
    (acc, m) => acc + (m.cuadrilla * m.jornal) / Math.max(m.rendimiento, 0.0001),
    0
  );
  const equipos = apu.equipos.reduce(
    (acc, e) => acc + (e.pctManoObra != null ? e.pctManoObra * manoObra : (e.cantidad ?? 0) * (e.precio ?? 0)),
    0
  );
  return { materiales, manoObra, equipos, total: materiales + manoObra + equipos };
}

// Jornales referenciales (S/. por día) — régimen de construcción civil,
// valores de práctica general. AJUSTA al convenio colectivo vigente.
const JORNAL: Record<CategoriaManoObra, number> = {
  Operario: 84,
  Oficial: 74,
  Peón: 66,
};

function herramientas3pct(): ApuEquipoItem {
  return { insumo: "Herramientas manuales", pctManoObra: 0.03 };
}

// --- Plantillas por tipo de partida --------------------------------------
// Cobertura inicial: las partidas con mayor peso en el costo de un proyecto
// típico (concreto, acero, encofrado, excavación, tarrajeo). Una partida sin
// plantilla simplemente no trae APU por defecto — sigue funcionando como
// hoy (precio unitario manual + % referencial por categoría).

function apuConcreto(): ApuDef {
  return {
    materiales: [
      { insumo: "Cemento Portland Tipo I", unidad: "bolsas", cantidad: 9.2, precio: 26 },
      { insumo: "Arena gruesa", unidad: "m³", cantidad: 0.48, precio: 90 },
      { insumo: "Piedra chancada 1/2\"", unidad: "m³", cantidad: 0.72, precio: 95 },
      { insumo: "Agua", unidad: "m³", cantidad: 0.186, precio: 5 },
    ],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 20, jornal: JORNAL.Operario },
      { categoria: "Oficial", cuadrilla: 1, rendimiento: 20, jornal: JORNAL.Oficial },
      { categoria: "Peón", cuadrilla: 6, rendimiento: 20, jornal: JORNAL.Peón },
    ],
    equipos: [
      { insumo: "Vibradora de concreto 4HP", cantidad: 0.05, precio: 180 },
      { insumo: "Mezcladora de concreto 11p3", cantidad: 0.05, precio: 220 },
      herramientas3pct(),
    ],
  };
}

function apuAceroHabilitadoYColocado(): ApuDef {
  return {
    materiales: [
      { insumo: "Acero corrugado fy=4200", unidad: "kg", cantidad: 1.05, precio: 4.8 },
      { insumo: "Alambre negro N°16", unidad: "kg", cantidad: 0.05, precio: 5.5 },
    ],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 250, jornal: JORNAL.Operario },
      { categoria: "Oficial", cuadrilla: 1, rendimiento: 250, jornal: JORNAL.Oficial },
    ],
    equipos: [herramientas3pct()],
  };
}

function apuEncofrado(): ApuDef {
  return {
    materiales: [
      { insumo: "Madera tornillo", unidad: "p2", cantidad: 6.5, precio: 5.2 },
      { insumo: "Clavos para madera", unidad: "kg", cantidad: 0.25, precio: 5 },
      { insumo: "Desmoldante", unidad: "gal", cantidad: 0.05, precio: 28 },
      { insumo: "Alambre negro N°8", unidad: "kg", cantidad: 0.2, precio: 5.5 },
    ],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 12, jornal: JORNAL.Operario },
      { categoria: "Peón", cuadrilla: 1, rendimiento: 12, jornal: JORNAL.Peón },
    ],
    equipos: [herramientas3pct()],
  };
}

function apuExcavacion(): ApuDef {
  return {
    materiales: [],
    manoObra: [{ categoria: "Peón", cuadrilla: 1, rendimiento: 4, jornal: JORNAL.Peón }],
    equipos: [herramientas3pct()],
  };
}

function apuTarrajeo(): ApuDef {
  return {
    materiales: [
      { insumo: "Cemento Portland Tipo I", unidad: "bolsas", cantidad: 0.22, precio: 26 },
      { insumo: "Arena fina", unidad: "m³", cantidad: 0.018, precio: 95 },
      { insumo: "Agua", unidad: "m³", cantidad: 0.006, precio: 5 },
    ],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 12, jornal: JORNAL.Operario },
      { categoria: "Peón", cuadrilla: 0.5, rendimiento: 12, jornal: JORNAL.Peón },
    ],
    equipos: [herramientas3pct()],
  };
}

// Detecta el tipo de partida por su texto (mismo criterio por regex que
// categorizarPartida en dashboardCharts.ts y volumenEfectivoConcreto en
// materiales.ts) y devuelve su plantilla — así un APU por defecto cubre
// TODAS las partidas de ese tipo (ej. concreto en columnas, en vigas, en
// zapatas...) sin repetir una plantilla por cada texto exacto de partida.
export function defaultApuFor(partida: string, unidad: string): ApuDef | null {
  if (unidad === "m³" && /concreto/i.test(partida) && /f'?c\s*=\s*\d+/i.test(partida)) return apuConcreto();
  if (unidad === "kg" && /acero/i.test(partida)) return apuAceroHabilitadoYColocado();
  if (unidad === "m²" && /encofrado/i.test(partida)) return apuEncofrado();
  if (unidad === "m³" && /excavaci[oó]n/i.test(partida)) return apuExcavacion();
  if (unidad === "m²" && /tarrajeo/i.test(partida) && /mezcla\s+C:A/i.test(partida)) return apuTarrajeo();
  return null;
}

// null = el usuario desactivó explícitamente el APU de esta partida (vuelve
// a precio manual, aunque exista una plantilla por defecto para su tipo).
export type ApuOverrides = Record<string, ApuDef | null>;

// APU efectivo de una partida: el que el usuario personalizó o desactivó, si
// hay una entrada; si no, la plantilla por defecto; si tampoco hay
// plantilla, null (la partida sigue con precio manual, como hoy).
export function resolveApu(key: string, partida: string, unidad: string, overrides: ApuOverrides): ApuDef | null {
  if (key in overrides) return overrides[key];
  return defaultApuFor(partida, unidad);
}
