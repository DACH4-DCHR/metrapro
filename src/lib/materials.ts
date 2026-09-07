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
  label: string;
  weightKgPerM: number; // peso nominal kg/m (norma ASTM/NTP)
}

// Pesos unitarios nominales de barras corrugadas de acero (kg/m)
export const REBAR_SIZES: RebarSize[] = [
  { id: "6", diameterMm: 6, label: 'Ø 6 mm (1/4")', weightKgPerM: 0.222 },
  { id: "8", diameterMm: 8, label: 'Ø 8 mm (3/8" aprox.)', weightKgPerM: 0.395 },
  { id: "10", diameterMm: 10, label: 'Ø 10 mm', weightKgPerM: 0.617 },
  { id: "12", diameterMm: 12, label: 'Ø 12 mm (1/2")', weightKgPerM: 0.888 },
  { id: "16", diameterMm: 16, label: 'Ø 16 mm (5/8")', weightKgPerM: 1.578 },
  { id: "20", diameterMm: 20, label: 'Ø 20 mm (3/4")', weightKgPerM: 2.466 },
  { id: "25", diameterMm: 25, label: "Ø 25 mm (1\")", weightKgPerM: 3.853 },
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
