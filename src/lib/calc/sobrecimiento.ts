import { calcularConcretoCiclopeo, type ConcretoCiclopeoInput } from "./concretoCiclopeo";

export type SobrecimientoInput = ConcretoCiclopeoInput;

export interface SobrecimientoResult {
  volumenTotal: number; // m3
  volumenPiedra: number; // m3
  volumenConcretoSimple: number; // m3
  encofradoM2: number; // m2 (ambas caras)
  warnings: string[];
}

export function calcularSobrecimiento(input: SobrecimientoInput): SobrecimientoResult {
  const warnings: string[] = [];
  const base = calcularConcretoCiclopeo(input);
  const encofradoM2 = 2 * input.longitudTotal * (input.altura / 100);

  if (input.porcentajePiedra > 30) {
    warnings.push(
      "El porcentaje de piedra desplazadora supera el 30% del volumen, el máximo permitido según E.060 Art. 22.10.1(b)."
    );
  }

  return { ...base, encofradoM2, warnings };
}
