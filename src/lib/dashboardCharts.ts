// Datos preparados para los gráficos del Dashboard: agrupa lo que ya se
// calcula en otros lados (presupuesto valorizado, elementos guardados) en la
// forma que necesitan los gráficos de barras, sin duplicar esos cálculos.
import { esPartidaMovimientoTierras, MOVILIZACION_PARTIDA, type PresupuestoRow } from "./presupuesto";
import type { CalculatedElement, ModuleType } from "./types";
import { MODULE_LABELS } from "./moduleLabels";

const CATEGORIAS_COSTO = ["Concreto", "Acero", "Encofrado", "Movimiento de Tierras", "Movilización", "Otros"] as const;
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
  Otros: "#008300",
};

function categorizarPartida(partida: string): CategoriaCosto {
  if (/concreto/i.test(partida)) return "Concreto";
  if (/acero/i.test(partida)) return "Acero";
  if (/encofrado/i.test(partida)) return "Encofrado";
  if (partida === MOVILIZACION_PARTIDA) return "Movilización";
  if (esPartidaMovimientoTierras(partida)) return "Movimiento de Tierras";
  return "Otros";
}

export interface CostoCategoriaItem {
  categoria: CategoriaCosto;
  monto: number;
  pct: number;
  color: string;
}

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
