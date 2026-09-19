// Tarrajeo y pintura por ambiente: a diferencia de los módulos estructurales,
// acá no hay acero ni concreto que calcular — solo áreas (muros y cielorraso)
// derivadas de las dimensiones del ambiente, que es como se metra en la
// práctica (Reglamento Nacional de Edificaciones, partidas de acabados).
export interface AcabadosInput {
  largo: number; // m
  ancho: number; // m
  altura: number; // m, de piso terminado a cielorraso
  areaVanos: number; // m², puertas y ventanas a descontar del área bruta de muros
  incluirTarrajeoMuros: boolean;
  incluirTarrajeoCielorraso: boolean;
  incluirPinturaMuros: boolean;
  incluirPinturaCielorraso: boolean;
}

export interface AcabadosResult {
  perimetro: number; // m
  areaMurosBruta: number; // m², perímetro × altura, sin descontar vanos
  areaMurosNeta: number; // m², bruta − vanos (nunca negativa)
  areaCielorraso: number; // m², largo × ancho
  warnings: string[];
}

export function calcularAcabados(input: AcabadosInput): AcabadosResult {
  const warnings: string[] = [];
  const perimetro = 2 * (input.largo + input.ancho);
  const areaMurosBruta = perimetro * input.altura;
  const areaVanos = Math.max(input.areaVanos, 0);
  const areaMurosNeta = Math.max(areaMurosBruta - areaVanos, 0);
  const areaCielorraso = input.largo * input.ancho;

  if (areaVanos > areaMurosBruta && areaMurosBruta > 0) {
    warnings.push("El área de vanos ingresada es mayor que el área bruta de muros — revisa los datos.");
  }

  return { perimetro, areaMurosBruta, areaMurosNeta, areaCielorraso, warnings };
}
