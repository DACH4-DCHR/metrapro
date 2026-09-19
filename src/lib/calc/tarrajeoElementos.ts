// Tarrajeo de columnas y vigas expuestas dentro de un ambiente: geometría
// simple (sección × longitud), sin acero ni concreto, porque eso ya se metra
// en sus módulos estructurales — acá solo interesa el área de superficie a
// tarrajear.
export interface TarrajeoColumnaInput {
  cantidad: number;
  ancho: number; // m
  profundidad: number; // m
  altura: number; // m
}

export interface TarrajeoVigaInput {
  cantidad: number;
  ancho: number; // m
  peralte: number; // m
  longitud: number; // m
}

// Columna: se asume libre en sus 4 caras (perímetro completo de la sección).
export function calcularAreaTarrajeoColumnas(input: TarrajeoColumnaInput): number {
  const cantidad = Math.max(input.cantidad, 0);
  const perimetro = 2 * (input.ancho + input.profundidad);
  return cantidad * perimetro * input.altura;
}

// Viga: la cara superior se une a la losa, así que solo se tarrajean el
// fondo y las 2 caras laterales.
export function calcularAreaTarrajeoVigas(input: TarrajeoVigaInput): number {
  const cantidad = Math.max(input.cantidad, 0);
  const perimetroExpuesto = input.ancho + 2 * input.peralte;
  return cantidad * perimetroExpuesto * input.longitud;
}
