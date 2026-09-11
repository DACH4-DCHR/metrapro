import { calcularConcretoCiclopeo, type ConcretoCiclopeoInput } from "./concretoCiclopeo";
import { calcularRellenoYEliminacion } from "./movimientoTierras";

export interface CimientoCorridoInput extends ConcretoCiclopeoInput {
  // Movimiento de tierras: excavación de la zanja continua (sobreancho solo en el
  // ancho, ya que "longitudTotal" es la longitud del tramo), relleno y compactado
  // con material propio, y eliminación del material excedente que desplaza el
  // propio concreto ciclópeo.
  incluirMovimientoTierras: boolean;
  profundidadExcavacion: number; // m, desde el nivel de terreno hasta el fondo del cimiento
  sobreanchoExcavacion: number; // cm, holgura por lado para encofrar y compactar (típico 10 cm)
  porcentajeEsponjamiento: number; // %, esponjamiento del material excedente (típico 25-30%)
}

export interface CimientoCorridoResult {
  volumenTotal: number; // m3
  volumenPiedra: number; // m3
  volumenConcretoSimple: number; // m3
  // Movimiento de tierras (solo cuando incluirMovimientoTierras es true)
  anchoExcavacion: number; // m
  volumenExcavacion: number; // m3
  areaNivelacionFondo: number; // m2
  volumenRelleno: number; // m3
  volumenEliminacion: number; // m3
  volumenEliminacionEsponjado: number; // m3
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

  const alturaM = input.altura / 100;
  const sobreanchoM = (Math.max(input.sobreanchoExcavacion, 0) * 2) / 100;
  const anchoExcavacion = input.incluirMovimientoTierras ? input.ancho / 100 + sobreanchoM : 0;
  const volumenExcavacion = input.incluirMovimientoTierras
    ? anchoExcavacion * input.longitudTotal * Math.max(input.profundidadExcavacion, 0)
    : 0;
  const areaNivelacionFondo = input.incluirMovimientoTierras ? anchoExcavacion * input.longitudTotal : 0;
  const { volumenRelleno, volumenEliminacion, volumenEliminacionEsponjado, warning: warningRelleno } =
    calcularRellenoYEliminacion({
      volumenExcavacion,
      volumenOcupadoCimentacion: base.volumenTotal,
      porcentajeEsponjamiento: input.porcentajeEsponjamiento,
    });
  if (input.incluirMovimientoTierras && warningRelleno) warnings.push(warningRelleno);
  if (input.incluirMovimientoTierras && input.profundidadExcavacion < alturaM) {
    warnings.push("La profundidad de excavación debe ser al menos igual a la altura del cimiento corrido.");
  }

  return {
    ...base,
    anchoExcavacion,
    volumenExcavacion,
    areaNivelacionFondo,
    volumenRelleno,
    volumenEliminacion,
    volumenEliminacionEsponjado,
    warnings,
  };
}
