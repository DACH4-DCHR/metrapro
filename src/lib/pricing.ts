// Precios referenciales por unidad de medida (S/.), usados como valor por defecto
// en el presupuesto referencial. Son aproximados y siempre editables por el usuario.
const DEFAULT_PRICE_BY_UNIT: Record<string, number> = {
  "m³": 380,
  kg: 4.8,
  und: 1.3,
  "m²": 45,
};

export function defaultUnitPrice(unidad: string): number {
  return DEFAULT_PRICE_BY_UNIT[unidad] ?? 0;
}

export function priceKey(partida: string, unidad: string): string {
  return `${partida}__${unidad}`;
}
