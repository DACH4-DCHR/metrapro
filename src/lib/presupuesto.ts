// Presupuesto referencial: valoriza el cuadro de metrados consolidado con precios
// unitarios por partida, y agrega Gastos Generales, Utilidad e IGV (editables y
// opcionales) para llegar a un Total General. Lo comparten el Dashboard (pantalla)
// y los reportes de Excel/PDF, para que el número exportado sea siempre el mismo
// que se ve en pantalla.
import type { CalculatedElement, MetradoLine, ModuleType } from "./types";
import { defaultUnitPrice, priceKey } from "./pricing";
import { consolidateLinesByModule } from "./consolidate";

// Gastos Generales, Utilidad e IGV se guardan como llaves reservadas dentro del
// mismo mapa "prices" (ya persistido en el backend con setPrice/putPrices) en vez
// de agregar columnas nuevas al proyecto — evita una migración de base de datos
// para 6 valores simples, y nunca chocan con una llave real de partida (que
// siempre trae "__<unidad>" al final, nunca estos sufijos).
export const GG_PCT_KEY = "__gastosGenerales_pct";
export const GG_ON_KEY = "__gastosGenerales_on";
export const UT_PCT_KEY = "__utilidad_pct";
export const UT_ON_KEY = "__utilidad_on";
export const IGV_PCT_KEY = "__igv_pct";
export const IGV_ON_KEY = "__igv_on";
export const GG_PCT_DEFAULT = 10;
export const UT_PCT_DEFAULT = 10;
export const IGV_PCT_DEFAULT = 18;

export interface PresupuestoRow {
  key: string;
  line: MetradoLine;
  price: number;
  subtotal: number;
}

export interface PresupuestoTotales {
  rows: PresupuestoRow[];
  costoDirecto: number;
  ggOn: boolean;
  ggPct: number;
  montoGG: number;
  utOn: boolean;
  utPct: number;
  montoUT: number;
  igvOn: boolean;
  igvPct: number;
  montoIGV: number;
  totalGeneral: number;
}

// Valoriza cualquier lista de líneas de metrado con los precios del proyecto
// (o el precio referencial por defecto según unidad, si aún no se editó). Es el
// núcleo que reutilizan tanto el Presupuesto Referencial (que además le suma
// Gastos Generales/Utilidad/IGV) como el costo de materiales, que no necesita
// esa capa adicional.
export function valorizarLineas(lines: MetradoLine[], prices: Record<string, number>): { rows: PresupuestoRow[]; total: number } {
  let total = 0;
  const rows: PresupuestoRow[] = lines.map((line) => {
    const key = priceKey(line.partida, line.unidad);
    const price = prices[key] ?? defaultUnitPrice(line.unidad);
    const subtotal = price * line.cantidad;
    total += subtotal;
    return { key, line, price, subtotal };
  });
  return { rows, total };
}

export interface PresupuestoModuloGroup {
  module: ModuleType;
  label: string;
  rows: PresupuestoRow[];
  subtotal: number;
}

// Mismas partidas y precios que calcularPresupuesto, pero organizadas por
// elemento (zapatas, vigas, losas, ...) en vez de en una sola lista plana —
// así se ve el Presupuesto Referencial en pantalla y en los reportes. La
// suma de los subtotales de cada grupo da exactamente el mismo costo directo
// que calcularPresupuesto (mismo precio por partida, sin importar cómo se
// agrupen las líneas), así que esta función NO reemplaza a calcularPresupuesto
// — los totales con Gastos Generales/Utilidad/IGV se siguen calculando ahí.
export function agruparPresupuestoPorModulo(
  elements: CalculatedElement[],
  prices: Record<string, number>
): PresupuestoModuloGroup[] {
  return consolidateLinesByModule(elements).map((group) => {
    const { rows, total } = valorizarLineas(group.lines, prices);
    return { module: group.module, label: group.label, rows, subtotal: total };
  });
}

export function calcularPresupuesto(consolidated: MetradoLine[], prices: Record<string, number>): PresupuestoTotales {
  const { rows, total: costoDirecto } = valorizarLineas(consolidated, prices);

  const ggOn = (prices[GG_ON_KEY] ?? 0) === 1;
  const ggPct = prices[GG_PCT_KEY] ?? GG_PCT_DEFAULT;
  const utOn = (prices[UT_ON_KEY] ?? 0) === 1;
  const utPct = prices[UT_PCT_KEY] ?? UT_PCT_DEFAULT;
  const igvOn = (prices[IGV_ON_KEY] ?? 0) === 1;
  const igvPct = prices[IGV_PCT_KEY] ?? IGV_PCT_DEFAULT;

  const montoGG = ggOn ? costoDirecto * (ggPct / 100) : 0;
  const montoUT = utOn ? costoDirecto * (utPct / 100) : 0;
  const montoIGV = igvOn ? (costoDirecto + montoGG + montoUT) * (igvPct / 100) : 0;
  const totalGeneral = costoDirecto + montoGG + montoUT + montoIGV;

  return { rows, costoDirecto, ggOn, ggPct, montoGG, utOn, utPct, montoUT, igvOn, igvPct, montoIGV, totalGeneral };
}

// Filas de totales del presupuesto (costo directo + GG/Utilidad/IGV activos +
// total general), listas para agregar como "foot" de una tabla. Recibe un
// formateador porque Excel necesita el número crudo (con 2 decimales) y el PDF
// necesita el texto ya formateado en soles — así ambos exportadores muestran
// exactamente las mismas filas sin duplicar esta lógica.
export function buildPresupuestoFootRows(
  presupuesto: PresupuestoTotales,
  fmt: (n: number) => string | number
): (string | number)[][] {
  const rows: (string | number)[][] = [["", "", "", "Costo directo (S/.)", fmt(presupuesto.costoDirecto)]];
  if (presupuesto.ggOn) {
    rows.push(["", "", "", `Gastos Generales (${presupuesto.ggPct}%)`, fmt(presupuesto.montoGG)]);
  }
  if (presupuesto.utOn) {
    rows.push(["", "", "", `Utilidad (${presupuesto.utPct}%)`, fmt(presupuesto.montoUT)]);
  }
  if (presupuesto.igvOn) {
    rows.push(["", "", "", `IGV (${presupuesto.igvPct}%)`, fmt(presupuesto.montoIGV)]);
  }
  rows.push(["", "", "", "TOTAL GENERAL (S/.)", fmt(presupuesto.totalGeneral)]);
  return rows;
}
