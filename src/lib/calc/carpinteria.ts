import type { VanoGrupoInput } from "./derrames";

// Carpintería y vidrios de un ambiente: puertas y ventanas por tipo (mismo
// patrón que los vanos de Tarrajeo de Interiores — cantidad + medida típica,
// no una puerta por puerta). El vidrio y las cerraduras NO se vuelven a medir
// a mano: salen directo de las ventanas/puertas ya ingresadas.
export interface CarpinteriaInput {
  puertas: VanoGrupoInput;
  ventanas: VanoGrupoInput;
  incluirVidrioVentanas: boolean;
  incluirCerraduras: boolean;
}

export interface CarpinteriaResult {
  numeroPuertas: number;
  areaPuertas: number; // m²
  numeroVentanas: number;
  areaVentanas: number; // m², también el área de vidrio si incluirVidrioVentanas
  warnings: string[];
}

export function calcularCarpinteria(input: CarpinteriaInput): CarpinteriaResult {
  const numeroPuertas = Math.max(input.puertas.cantidad, 0);
  const areaPuertas = numeroPuertas * input.puertas.ancho * input.puertas.alto;
  const numeroVentanas = Math.max(input.ventanas.cantidad, 0);
  const areaVentanas = numeroVentanas * input.ventanas.ancho * input.ventanas.alto;

  return { numeroPuertas, areaPuertas, numeroVentanas, areaVentanas, warnings: [] };
}
