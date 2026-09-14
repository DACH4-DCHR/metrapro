// Presupuesto referencial: valoriza el cuadro de metrados consolidado con precios
// unitarios por partida, y agrega Gastos Generales, Utilidad e IGV (editables y
// opcionales) para llegar a un Total General. Lo comparten el Dashboard (pantalla)
// y los reportes de Excel/PDF, para que el número exportado sea siempre el mismo
// que se ve en pantalla.
import type { MetradoLine } from "./types";
import { defaultUnitPrice, priceKey } from "./pricing";

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

export function calcularPresupuesto(consolidated: MetradoLine[], prices: Record<string, number>): PresupuestoTotales {
  let costoDirecto = 0;
  const rows: PresupuestoRow[] = consolidated.map((line) => {
    const key = priceKey(line.partida, line.unidad);
    const price = prices[key] ?? defaultUnitPrice(line.unidad);
    const subtotal = price * line.cantidad;
    costoDirecto += subtotal;
    return { key, line, price, subtotal };
  });

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
