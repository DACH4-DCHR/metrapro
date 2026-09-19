// Piso terminado de un ambiente: el área sale directo de las dimensiones en
// planta, igual que el cielorraso de Tarrajeo de Interiores. El contrapiso
// (mortero de base) es opcional porque en obra a veces ya existe (losa de
// concreto pulida) o se metra en otro módulo.
export type TipoPiso = "ceramico" | "porcelanato" | "cemento_pulido" | "vinilico";

export const TIPO_PISO_LABEL: Record<TipoPiso, string> = {
  ceramico: "Piso cerámico",
  porcelanato: "Piso porcelanato",
  cemento_pulido: "Piso de cemento pulido",
  vinilico: "Piso vinílico",
};

export interface PisosPavimentosInput {
  largo: number; // m
  ancho: number; // m
  tipoPiso: TipoPiso;
  incluirContrapiso: boolean;
}

export interface PisosPavimentosResult {
  areaPiso: number; // m²
  warnings: string[];
}

export function calcularPisosPavimentos(input: PisosPavimentosInput): PisosPavimentosResult {
  const areaPiso = input.largo * input.ancho;
  return { areaPiso, warnings: [] };
}
