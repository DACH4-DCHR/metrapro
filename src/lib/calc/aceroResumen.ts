import { getRebar } from "../materials";
import type { MetradoLine } from "../types";

// Longitud comercial estándar de varilla de acero corrugado en el mercado peruano
// (Aceros Arequipa y distribuidores: disponible en 9 m para todos los diámetros de
// 6 mm a 5/8", algunos diámetros mayores también en 12 m bajo pedido).
export const LONGITUD_VARILLA_COMERCIAL_M = 9;

export interface AceroItem {
  diametroId: string;
  longitudM: number; // longitud total de este diámetro para un rol específico (puede repetirse el mismo diámetro en varios roles; se agrupan)
}

export interface AceroResumenItem {
  diametroId: string;
  diametroMm: number;
  label: string;
  weightKgPerM: number;
  longitudTotalM: number;
  pesoKg: number;
  numeroVarillas: number; // varillas comerciales de 9 m, redondeado hacia arriba
}

// Agrupa una lista de entradas (peso/longitud por rol, ej. "principal", "estribos",
// "temperatura") en un resumen único por diámetro, sumando la longitud de todos los
// roles que compartan el mismo diámetro.
export function resumirAceroPorDiametro(items: AceroItem[]): AceroResumenItem[] {
  const map = new Map<string, number>();
  for (const item of items) {
    if (item.longitudM <= 0) continue;
    map.set(item.diametroId, (map.get(item.diametroId) ?? 0) + item.longitudM);
  }
  return Array.from(map.entries())
    .map(([diametroId, longitudTotalM]) => {
      const rebar = getRebar(diametroId);
      return {
        diametroId,
        diametroMm: rebar.diameterMm,
        label: rebar.label,
        weightKgPerM: rebar.weightKgPerM,
        longitudTotalM,
        pesoKg: longitudTotalM * rebar.weightKgPerM,
        numeroVarillas: Math.ceil(longitudTotalM / LONGITUD_VARILLA_COMERCIAL_M),
      };
    })
    .sort((a, b) => a.diametroMm - b.diametroMm);
}

// Convierte el resumen por diámetro en líneas de metrado: por cada diámetro, una
// línea de peso (kg) — con el peso por metro en el nombre de la partida para
// referencia rápida — y una línea de varillas comerciales (und) para habilitación.
export function lineasAceroPorDiametro(items: AceroItem[]): MetradoLine[] {
  const resumen = resumirAceroPorDiametro(items);
  const lines: MetradoLine[] = [];
  for (const r of resumen) {
    lines.push({
      partida: `Acero de refuerzo Ø${r.diametroMm}mm (${r.weightKgPerM.toFixed(3)} kg/m)`,
      unidad: "kg",
      cantidad: r.pesoKg,
    });
    lines.push({
      partida: `Varillas Ø${r.diametroMm}mm x ${LONGITUD_VARILLA_COMERCIAL_M}m (habilitación)`,
      unidad: "und",
      cantidad: r.numeroVarillas,
    });
  }
  return lines;
}
