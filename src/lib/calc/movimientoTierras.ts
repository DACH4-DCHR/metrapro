// Movimiento de tierras: excavación de zanjas o pozos para elementos de cimentación
// (zapatas, cimientos corridos, vigas de cimentación), relleno y compactado con
// material propio, y eliminación del material excedente. Sigue la práctica estándar
// de metrados de movimiento de tierras (CAPECO) y la profundidad mínima usual de
// cimentación en suelos sin problemas especiales de la NTE E.050 (Art. 22).

export interface MovimientoTierrasInput {
  largo: number; // m, longitud de la zanja/pozo (o del tramo repetido)
  ancho: number; // m, ancho neto de la cimentación a excavar
  profundidad: number; // m, profundidad de excavación desde el nivel de terreno
  numeroExcavaciones: number; // und, número de zanjas/pozos iguales
  sobreanchoTrabajo: number; // cm, holgura por lado para encofrado y compactado (típico 10 cm)
  volumenOcupadoCimentacion: number; // m3, volumen que ocupará el concreto de la cimentación (se descuenta del relleno)
  porcentajeEsponjamiento: number; // %, esponjamiento del material excavado para eliminación (típico 25-30%)
}

export interface MovimientoTierrasResult {
  anchoExcavacion: number; // m, ancho + sobreancho de trabajo en ambos lados
  volumenExcavacion: number; // m3
  areaNivelacionFondo: number; // m2, refine y nivelación del fondo de excavación
  volumenRelleno: number; // m3, relleno y compactado con material propio
  volumenEliminacion: number; // m3, material excedente en banco (sin esponjar)
  volumenEliminacionEsponjado: number; // m3, material excedente esponjado, para acarreo y eliminación
  warnings: string[];
}

export function calcularMovimientoTierras(input: MovimientoTierrasInput): MovimientoTierrasResult {
  const warnings: string[] = [];

  const sobreanchoM = (Math.max(input.sobreanchoTrabajo, 0) * 2) / 100;
  const anchoExcavacion = Math.max(input.ancho, 0) + sobreanchoM;
  const numeroExcavaciones = Math.max(input.numeroExcavaciones, 0);

  const volumenExcavacion =
    anchoExcavacion * Math.max(input.largo, 0) * Math.max(input.profundidad, 0) * numeroExcavaciones;
  const areaNivelacionFondo = anchoExcavacion * Math.max(input.largo, 0) * numeroExcavaciones;

  const volumenOcupado = Math.max(input.volumenOcupadoCimentacion, 0);
  if (volumenOcupado > volumenExcavacion) {
    warnings.push(
      "El volumen ocupado por la cimentación es mayor al volumen excavado; revisa las dimensiones de la excavación."
    );
  }

  const volumenRelleno = Math.max(volumenExcavacion - volumenOcupado, 0);
  const volumenEliminacion = Math.min(volumenOcupado, volumenExcavacion);
  const volumenEliminacionEsponjado = volumenEliminacion * (1 + Math.max(input.porcentajeEsponjamiento, 0) / 100);

  if (input.profundidad > 0 && input.profundidad < 0.8) {
    warnings.push(
      "La profundidad de excavación es menor a 0.80 m, la mínima usual de cimentación en suelos sin problemas especiales (NTE E.050 Art. 22); verifica con el estudio de suelos del proyecto."
    );
  }
  if (input.sobreanchoTrabajo < 5) {
    warnings.push(
      "El sobreancho de trabajo por lado es muy reducido; se recomienda dejar al menos 10 cm para encofrar y compactar el relleno."
    );
  }

  return {
    anchoExcavacion,
    volumenExcavacion,
    areaNivelacionFondo,
    volumenRelleno,
    volumenEliminacion,
    volumenEliminacionEsponjado,
    warnings,
  };
}
