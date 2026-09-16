// Datos preparados para los gráficos del Dashboard: agrupa lo que ya se
// calcula en otros lados (presupuesto valorizado, elementos guardados) en la
// forma que necesitan los gráficos de barras, sin duplicar esos cálculos.
import type { PresupuestoRow } from "./presupuesto";
import type { CalculatedElement, ModuleType } from "./types";
import { MODULE_LABELS } from "./moduleLabels";

const CATEGORIAS_COSTO = ["Concreto", "Acero", "Encofrado", "Otros"] as const;
export type CategoriaCosto = (typeof CATEGORIAS_COSTO)[number];

// Mismo orden y colores siempre (paleta categórica fija, nunca ciclada): así
// "Concreto" es azul en todos los proyectos, independientemente de qué
// categorías tengan monto en un proyecto puntual.
const CATEGORIA_COLOR: Record<CategoriaCosto, string> = {
  Concreto: "#2a78d6",
  Acero: "#eb6834",
  Encofrado: "#1baf7a",
  Otros: "#eda100",
};

function categorizarPartida(partida: string): CategoriaCosto {
  if (/concreto/i.test(partida)) return "Concreto";
  if (/acero/i.test(partida)) return "Acero";
  if (/encofrado/i.test(partida)) return "Encofrado";
  return "Otros";
}

export interface CostoCategoriaItem {
  categoria: CategoriaCosto;
  monto: number;
  color: string;
}

// Costo directo del presupuesto (sin GG/Utilidad/IGV, que son porcentajes
// sobre el total y no se pueden repartir por categoría) agrupado en 4
// categorías fijas, para el gráfico "Costo directo por categoría".
export function costosPorCategoria(rows: PresupuestoRow[]): CostoCategoriaItem[] {
  const totales: Record<CategoriaCosto, number> = { Concreto: 0, Acero: 0, Encofrado: 0, Otros: 0 };
  for (const row of rows) {
    totales[categorizarPartida(row.line.partida)] += row.subtotal;
  }
  return CATEGORIAS_COSTO.map((categoria) => ({
    categoria,
    monto: totales[categoria],
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
