// Tarrajeo de un paño de fachada o muro exterior: a diferencia del tarrajeo de
// interiores (que se metra por ambiente completo, 4 lados), acá se metra un
// solo paño a la vez porque las fachadas rara vez comparten altura o vanos
// entre sí.
export interface TarrajeoExterioresInput {
  longitud: number; // m, desarrollo del paño en planta
  altura: number; // m
  areaVanos: number; // m², puertas y ventanas del paño, a descontar
}

export interface TarrajeoExterioresResult {
  areaBruta: number; // m²
  areaNeta: number; // m², bruta − vanos (nunca negativa)
  warnings: string[];
}

export function calcularTarrajeoExteriores(input: TarrajeoExterioresInput): TarrajeoExterioresResult {
  const warnings: string[] = [];
  const areaBruta = input.longitud * input.altura;
  const areaVanos = Math.max(input.areaVanos, 0);
  const areaNeta = Math.max(areaBruta - areaVanos, 0);

  if (areaVanos > areaBruta && areaBruta > 0) {
    warnings.push("El área de vanos ingresada es mayor que el área bruta del paño — revisa los datos.");
  }

  return { areaBruta, areaNeta, warnings };
}
