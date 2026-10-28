// Obras provisionales y trabajos preliminares: partidas previas al inicio de
// obra, todas derivadas de las mismas dos medidas del terreno (ningún dato
// nuevo entre una partida y otra) — cada una se activa por separado porque no
// todo proyecto las necesita todas (ej. un cerco ya existente).
export interface ObrasProvisionalesInput {
  largoTerreno: number; // m
  anchoTerreno: number; // m
  incluirCartel: boolean;
  incluirCerco: boolean;
  incluirTrazo: boolean;
  incluirLimpiezaPermanente: boolean;
  incluirLimpiezaFinal: boolean;
}

export interface ObrasProvisionalesResult {
  areaTerreno: number; // m²
  perimetroTerreno: number; // m
  warnings: string[];
}

export function calcularObrasProvisionales(input: ObrasProvisionalesInput): ObrasProvisionalesResult {
  const areaTerreno = input.largoTerreno * input.anchoTerreno;
  const perimetroTerreno = 2 * (input.largoTerreno + input.anchoTerreno);
  return { areaTerreno, perimetroTerreno, warnings: [] };
}
