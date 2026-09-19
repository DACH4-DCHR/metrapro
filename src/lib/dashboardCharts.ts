// Datos preparados para los gráficos del Dashboard: agrupa lo que ya se
// calcula en otros lados (presupuesto valorizado, elementos guardados) en la
// forma que necesitan los gráficos de barras, sin duplicar esos cálculos.
import { esPartidaMovimientoTierras, MOVILIZACION_PARTIDA, type PresupuestoRow } from "./presupuesto";
import type { CalculatedElement, ModuleType } from "./types";
import { MODULE_LABELS } from "./moduleLabels";

const CATEGORIAS_COSTO = [
  "Concreto",
  "Acero",
  "Encofrado",
  "Movimiento de Tierras",
  "Movilización",
  "Acabados",
  "Otros",
] as const;
export type CategoriaCosto = (typeof CATEGORIAS_COSTO)[number];

// Mismo orden y colores siempre (paleta categórica fija, nunca ciclada): así
// "Concreto" es azul en todos los proyectos, independientemente de qué
// categorías tengan monto en un proyecto puntual. "Movimiento de Tierras" y
// "Movilización" antes caían dentro de "Otros" — con proyectos que mueven
// bastante tierra o le ponen precio alto a la movilización, "Otros" se veía
// desproporcionado sin explicar por qué; separarlas responde esa pregunta.
const CATEGORIA_COLOR: Record<CategoriaCosto, string> = {
  Concreto: "#2a78d6",
  Acero: "#eb6834",
  Encofrado: "#1baf7a",
  "Movimiento de Tierras": "#eda100",
  Movilización: "#e87ba4",
  Acabados: "#4a3aa7",
  Otros: "#008300",
};

function categorizarPartida(partida: string): CategoriaCosto {
  if (/concreto/i.test(partida)) return "Concreto";
  if (/acero/i.test(partida)) return "Acero";
  if (/encofrado/i.test(partida)) return "Encofrado";
  if (partida === MOVILIZACION_PARTIDA) return "Movilización";
  if (esPartidaMovimientoTierras(partida)) return "Movimiento de Tierras";
  if (/tarrajeo|pintura|piso|contrapiso|vestidura|garganta/i.test(partida)) return "Acabados";
  return "Otros";
}

export interface CostoCategoriaItem {
  categoria: CategoriaCosto;
  monto: number;
  pct: number;
  color: string;
}

// Mismo criterio que Movilización: color propio, no parte del ramp de las 5
// secciones — se exporta para que Dashboard.tsx arme la barra de
// "Movilización de Equipo" con el mismo color que usa el resto de la app.
export const MOVILIZACION_COLOR = CATEGORIA_COLOR["Movilización"];
export const OTROS_COLOR = CATEGORIA_COLOR["Otros"];

// Agrupa cada ModuleType estructural en la misma sección que ya se ve en el
// menú (navGroups de Layout.tsx) — Movimiento de Tierras, Cimentación,
// Elementos Verticales, Superestructura, Tabiquería — para desglosar
// "Metrados Estructurales" en el gráfico de costos por esas 5 secciones
// reales en vez de por tipo de material (concreto/acero/encofrado), que
// mezclaba elementos muy distintos en una sola barra sin decir a qué parte
// de la obra pertenecen.
export const ESTRUCTURAL_SECCION_POR_MODULO: Partial<Record<ModuleType, string>> = {
  movimientoTierras: "Movimiento de Tierras",
  zapata: "Cimentación",
  cimientoCorrido: "Cimentación",
  sobrecimiento: "Cimentación",
  vigaCimentacion: "Cimentación",
  columna: "Elementos Verticales",
  placa: "Elementos Verticales",
  muroAlbanileria: "Elementos Verticales",
  viga: "Superestructura",
  losa: "Superestructura",
  losaMaciza: "Superestructura",
  escalera: "Superestructura",
  muroArquitectura: "Tabiquería",
};

export const ESTRUCTURAL_SECCIONES_ORDEN = [
  "Movimiento de Tierras",
  "Cimentación",
  "Elementos Verticales",
  "Superestructura",
  "Tabiquería",
] as const;

// Ramp secuencial (un solo matiz azul, oscuro→claro) para las 5 secciones,
// mismo criterio que ACABADOS_MODULO_COLOR — son sub-partes de una misma
// familia ("Metrados Estructurales"), no identidades tan distintas entre sí
// como para merecer 5 matices categóricos nuevos.
export const ESTRUCTURAL_SECCION_COLOR: Record<(typeof ESTRUCTURAL_SECCIONES_ORDEN)[number], string> = {
  "Movimiento de Tierras": "#2a78d6",
  Cimentación: "#4f91e0",
  "Elementos Verticales": "#74aae9",
  Superestructura: "#9ac3f0",
  Tabiquería: "#c0dbf7",
};

// Ramp secuencial (un solo matiz violeta, claro→oscuro) para desglosar
// "Acabados y Adicionales" en sus módulos reales dentro del gráfico de costos
// del Dashboard — a diferencia de las categorías estructurales (identidades
// distintas entre sí: concreto, acero, encofrado...), estos 5 son subtipos de
// una misma familia, así que un ramp secuencial sobre el mismo matiz de
// "Acabados" comunica mejor esa relación que inventarles colores categóricos
// nuevos (que ya no caben en la paleta fija de 8 matices del proyecto).
export const ACABADOS_MODULO_COLOR: Record<
  "tarrajeoInteriores" | "tarrajeoExteriores" | "tarrajeoEscalera" | "pisosPavimentos" | "pintura",
  string
> = {
  tarrajeoInteriores: "#4a3aa7",
  tarrajeoExteriores: "#6c5cc4",
  tarrajeoEscalera: "#8f7ad9",
  pisosPavimentos: "#b3a3e8",
  pintura: "#d6cef2",
};

// Costo directo del presupuesto (sin GG/Utilidad/IGV, que son porcentajes
// sobre el total y no se pueden repartir por categoría) agrupado en 6
// categorías fijas, para el gráfico "Costo directo por categoría".
export function costosPorCategoria(rows: PresupuestoRow[]): CostoCategoriaItem[] {
  const totales: Record<CategoriaCosto, number> = {
    Concreto: 0,
    Acero: 0,
    Encofrado: 0,
    "Movimiento de Tierras": 0,
    Movilización: 0,
    Acabados: 0,
    Otros: 0,
  };
  let total = 0;
  for (const row of rows) {
    totales[categorizarPartida(row.line.partida)] += row.subtotal;
    total += row.subtotal;
  }
  return CATEGORIAS_COSTO.map((categoria) => ({
    categoria,
    monto: totales[categoria],
    pct: total > 0 ? (totales[categoria] / total) * 100 : 0,
    color: CATEGORIA_COLOR[categoria],
  })).filter((c) => c.monto > 0);
}

// % de mano de obra referencial por categoría, sobre el costo directo de esa
// categoría — valores típicos del mercado peruano (no un Análisis de Precios
// Unitarios real, que MetraPro no maneja hoy: cada partida tiene un solo
// precio unitario, sin desglose de materiales/mano de obra/equipo). Acero es
// mayormente material (el fierro corrugado es caro por kg, habilitarlo y
// colocarlo pesa poco en el costo); Encofrado es más intensivo en mano de
// obra. Movilización se trata como no-mano-de-obra: es un costo de traslado
// de equipos, no de trabajo en obra.
const PCT_MANO_OBRA: Record<CategoriaCosto, number> = {
  Concreto: 0.35,
  Acero: 0.15,
  Encofrado: 0.55,
  "Movimiento de Tierras": 0.45,
  Movilización: 0.1,
  Acabados: 0.55,
  Otros: 0.4,
};

export interface ManoObraMateriales {
  manoObra: number;
  materiales: number;
  pctManoObra: number;
  pctMateriales: number;
}

// Reparto del costo directo real del presupuesto (no un valor de ejemplo)
// entre mano de obra y materiales, para las tarjetas del Dashboard — más
// relevante para el cliente que ver m³ de concreto o kg de acero.
export function manoObraVsMateriales(rows: PresupuestoRow[]): ManoObraMateriales {
  let manoObra = 0;
  let total = 0;
  for (const row of rows) {
    manoObra += row.subtotal * PCT_MANO_OBRA[categorizarPartida(row.line.partida)];
    total += row.subtotal;
  }
  const materiales = total - manoObra;
  return {
    manoObra,
    materiales,
    pctManoObra: total > 0 ? (manoObra / total) * 100 : 0,
    pctMateriales: total > 0 ? (materiales / total) * 100 : 0,
  };
}

export interface ModuloCantidades {
  module: ModuleType;
  label: string;
  concreteM3: number;
  steelKg: number;
  formworkM2: number;
}

// Suma concreto/acero/encofrado por módulo (zapata, viga, losa, ...) a partir
// de los elementos guardados. m³, kg y m² no se pueden comparar en un mismo
// eje, así que esto alimenta 3 mini-gráficos separados (uno por magnitud),
// nunca uno solo con las tres mezcladas.
export function cantidadesPorModulo(elements: CalculatedElement[]): ModuloCantidades[] {
  const totales = new Map<ModuleType, { concreteM3: number; steelKg: number; formworkM2: number }>();
  for (const el of elements) {
    const cur = totales.get(el.module) ?? { concreteM3: 0, steelKg: 0, formworkM2: 0 };
    cur.concreteM3 += el.concreteM3;
    cur.steelKg += el.steelKg;
    cur.formworkM2 += el.formworkM2;
    totales.set(el.module, cur);
  }
  return Array.from(totales.entries()).map(([module, t]) => ({
    module,
    label: MODULE_LABELS[module],
    ...t,
  }));
}
