// Base de datos de materiales de referencia (editable a futuro desde configuración).

export interface ConcreteGrade {
  id: string;
  label: string;
  fc: number; // kg/cm2
  cementBagsPerM3: number; // bolsas de cemento por m3 (referencial, mezcla 1:2:2 aprox.)
  sandM3PerM3: number;
  gravelM3PerM3: number;
  waterLPerM3: number;
}

export const CONCRETE_GRADES: ConcreteGrade[] = [
  { id: "175", label: "f'c 175 kg/cm²", fc: 175, cementBagsPerM3: 7.0, sandM3PerM3: 0.53, gravelM3PerM3: 0.55, waterLPerM3: 185 },
  { id: "210", label: "f'c 210 kg/cm²", fc: 210, cementBagsPerM3: 9.0, sandM3PerM3: 0.52, gravelM3PerM3: 0.53, waterLPerM3: 186 },
  { id: "280", label: "f'c 280 kg/cm²", fc: 280, cementBagsPerM3: 10.5, sandM3PerM3: 0.5, gravelM3PerM3: 0.52, waterLPerM3: 190 },
];

export const CONCRETE_DENSITY_KG_M3 = 2400;

export interface RebarSize {
  id: string;
  diameterMm: number;
  // Cómo se nombra en obra en Perú (sin el "Ø", que ya ponen los que lo usan):
  // en pulgada para las que tienen un calibre comercial estándar (3/8", 1/2",
  // 5/8", 3/4", 1"), o en mm para los calibres que solo se venden así (6, 8,
  // 10 y 12 mm — el mercado peruano los ofrece como productos propios, no
  // como una forma de nombrar la pulgada más cercana).
  symbol: string;
  label: string;
  weightKgPerM: number; // peso nominal kg/m (norma ASTM A615 / NTP 341.031)
  color: string; // color distintivo por diámetro, usado en las vistas de planta/3D
}

// Pesos unitarios nominales de barras corrugadas de acero (kg/m), según
// ASTM A615 / NTP 341.031 (peso = 0.006165 x diámetro_mm², densidad 7850
// kg/m³). El color es fijo por diámetro (no por rol) para que un mismo Ø se
// identifique igual en toda la app — cámbialo aquí si se agregan más
// diámetros.
//
// 6, 8 y 12 mm son calibres reales que se venden en Perú como tales (no son
// una forma redondeada de nombrar 1/4", 5/16" o 1/2") — por eso conviven con
// la pulgada real correspondiente en vez de reemplazarla (ids "6", "8" y
// "12" vs. "1/2" más abajo). 16, 20 y 25 mm SÍ eran, antes de esta
// corrección, una simplificación del diámetro real de 5/8", 3/4" y 1" —
// tenían el peso de un Ø literal de 16/20/25 mm en vez del peso real de esas
// pulgadas (hasta 10% más pesado en el caso de 3/4"), así que se corrigieron
// al diámetro y peso real de la pulgada. 10 mm no tiene un equivalente en
// pulgada de uso corriente en Perú (se usa tal cual, típicamente en
// estribos), así que se deja solo en mm.
export const REBAR_SIZES: RebarSize[] = [
  { id: "6", diameterMm: 6, symbol: "6mm", label: 'Ø 6 mm (uso equivalente a 1/4")', weightKgPerM: 0.222, color: "#0891b2" },
  { id: "8", diameterMm: 8, symbol: "8mm", label: 'Ø 8 mm (uso equivalente a 5/16")', weightKgPerM: 0.395, color: "#7c3aed" },
  { id: "10", diameterMm: 10, symbol: "10mm", label: "Ø 10 mm", weightKgPerM: 0.617, color: "#db2777" },
  { id: "12", diameterMm: 12, symbol: "12mm", label: 'Ø 12 mm (uso equivalente a 1/2")', weightKgPerM: 0.888, color: "#2563eb" },
  { id: "12.7", diameterMm: 12.7, symbol: '1/2"', label: 'Ø 1/2" (12.7 mm)', weightKgPerM: 0.994, color: "#1d4ed8" },
  { id: "16", diameterMm: 15.875, symbol: '5/8"', label: 'Ø 5/8" (15.9 mm)', weightKgPerM: 1.552, color: "#0b1f3a" },
  { id: "20", diameterMm: 19.05, symbol: '3/4"', label: 'Ø 3/4" (19.1 mm)', weightKgPerM: 2.235, color: "#16a34a" },
  { id: "25", diameterMm: 25.4, symbol: '1"', label: 'Ø 1" (25.4 mm)', weightKgPerM: 3.973, color: "#dc2626" },
];

export function getRebar(id: string): RebarSize {
  return REBAR_SIZES.find((r) => r.id === id) ?? REBAR_SIZES[3];
}

export type HollowBlockMaterialId = "arcilla" | "tecnopor";

export interface HollowBlockMaterial {
  id: HollowBlockMaterialId;
  label: string;
  // Dimensiones comerciales típicas del bloque/casetón (m). El ancho debe calzar
  // en el vano entre viguetas; el largo determina cuántas unidades entran por m².
  lengthM: number;
  widthM: number;
  // Densidad usada solo para estimar el peso de una altura personalizada (kg/m3).
  densityKgM3: number;
}

// Ladrillo de arcilla ("pastelero"): 0.30 x 0.30 x h m, el estándar en el Perú.
// Bloque de tecnopor (EPS): casetón comercial de 1.20 x 0.30 x h m — mismo ancho
// (para calzar entre viguetas) pero 4 veces más largo, por lo que se necesitan
// ~4 veces menos unidades por m² que con ladrillo de arcilla.
export const HOLLOW_BLOCK_MATERIALS: HollowBlockMaterial[] = [
  { id: "arcilla", label: "Ladrillo de arcilla", lengthM: 0.3, widthM: 0.3, densityKgM3: 420 },
  { id: "tecnopor", label: "Bloque de tecnopor (EPS)", lengthM: 1.2, widthM: 0.3, densityKgM3: 15 },
];

export function getHollowBlockMaterial(id: HollowBlockMaterialId): HollowBlockMaterial {
  return HOLLOW_BLOCK_MATERIALS.find((m) => m.id === id) ?? HOLLOW_BLOCK_MATERIALS[0];
}

export const HOLLOW_BLOCK_HEIGHT_OPTIONS = [
  { id: "12", heightCm: 12 },
  { id: "15", heightCm: 15 },
  { id: "20", heightCm: 20 },
];

// Pesos unitarios aproximados de mercado por material y altura estándar (kg/und).
const HOLLOW_BLOCK_WEIGHTS: Record<HollowBlockMaterialId, Record<string, number>> = {
  arcilla: { "12": 4.4, "15": 5.4, "20": 7.9 },
  tecnopor: { "12": 0.16, "15": 0.2, "20": 0.27 },
};

export function hollowBlockWeightKg(
  material: HollowBlockMaterialId,
  heightCm: number,
  isCustomHeight: boolean
): number {
  if (!isCustomHeight) {
    const known = HOLLOW_BLOCK_WEIGHTS[material]?.[String(heightCm)];
    if (known != null) return known;
  }
  const dims = getHollowBlockMaterial(material);
  const volumeM3 = dims.lengthM * dims.widthM * (heightCm / 100);
  return volumeM3 * dims.densityKgM3;
}

export const OTHER_MATERIALS = [
  { id: "cemento", label: "Cemento", unit: "bls" },
  { id: "arena", label: "Arena gruesa", unit: "m³" },
  { id: "piedra", label: "Piedra chancada", unit: "m³" },
  { id: "ladrillo", label: "Ladrillo aligerante", unit: "und" },
  { id: "madera", label: "Madera para encofrado", unit: "p²" },
];

// Rendimiento referencial de madera de encofrado por m2 de encofrado (pies tablares).
export const FORMWORK_TIMBER_BOARD_FEET_PER_M2 = 5.5;
