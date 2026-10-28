// Cielorraso con yeso de un ambiente: el área sale directo de las
// dimensiones en planta, igual que el piso terminado de Pisos y Pavimentos.
export interface CielorrasoInput {
  largo: number; // m
  ancho: number; // m
}

export interface CielorrasoResult {
  areaCielorraso: number; // m²
  warnings: string[];
}

export function calcularCielorraso(input: CielorrasoInput): CielorrasoResult {
  const areaCielorraso = input.largo * input.ancho;
  return { areaCielorraso, warnings: [] };
}
