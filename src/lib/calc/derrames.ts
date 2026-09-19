// Vanos de un ambiente (puertas y ventanas), agrupados por tipo con una
// medida típica y una cantidad — no un vano por vano — porque en la práctica
// la mayoría de ambientes repiten 1 ó 2 tamaños de puerta/ventana. El área
// sirve para descontar del tarrajeo de muros; el perímetro (derrame) es la
// vestidura de la jamba y el dintel del vano, en metros lineales.
//
// La puerta no tiene derrame en la base (llega al piso); la ventana sí tiene
// derrame en los 4 lados.
export interface VanoGrupoInput {
  cantidad: number;
  ancho: number; // m
  alto: number; // m
}

export interface VanosResult {
  areaTotal: number; // m²
  perimetroDerramesTotal: number; // m
}

function calcularGrupo(vano: VanoGrupoInput, incluirBase: boolean): { area: number; perimetro: number } {
  const cantidad = Math.max(vano.cantidad, 0);
  const area = cantidad * vano.ancho * vano.alto;
  const perimetroUnitario = incluirBase ? 2 * (vano.ancho + vano.alto) : 2 * vano.alto + vano.ancho;
  return { area, perimetro: cantidad * perimetroUnitario };
}

export function calcularVanos(puertas: VanoGrupoInput, ventanas: VanoGrupoInput): VanosResult {
  const gPuertas = calcularGrupo(puertas, false);
  const gVentanas = calcularGrupo(ventanas, true);
  return {
    areaTotal: gPuertas.area + gVentanas.area,
    perimetroDerramesTotal: gPuertas.perimetro + gVentanas.perimetro,
  };
}
