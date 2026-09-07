import { calcularConcretoCiclopeo, type ConcretoCiclopeoInput } from "./concretoCiclopeo";

export type CimientoCorridoInput = ConcretoCiclopeoInput;

export interface CimientoCorridoResult {
  volumenTotal: number; // m3
  volumenPiedra: number; // m3
  volumenConcretoSimple: number; // m3
  warnings: string[];
}

export function calcularCimientoCorrido(input: CimientoCorridoInput): CimientoCorridoResult {
  const warnings: string[] = [];
  const base = calcularConcretoCiclopeo(input);

  if (input.porcentajePiedra > 30) {
    warnings.push(
      "El porcentaje de piedra desplazadora supera el 30% del volumen, el máximo permitido según E.060 Art. 22.10.1(b)."
    );
  }
  if (input.ancho < 30) {
    warnings.push(
      "El ancho es menor a 30 cm; verifica que sea suficiente para el muro que soporta y la capacidad portante del suelo (NTE E.050)."
    );
  }

  return { ...base, warnings };
}
