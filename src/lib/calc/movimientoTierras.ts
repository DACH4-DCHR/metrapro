// Movimiento de tierras: excavación de zanjas o pozos para elementos de cimentación
// (zapatas, cimientos corridos, vigas de cimentación), relleno y compactado con
// material propio, y eliminación del material excedente. Sigue la práctica estándar
// de metrados de movimiento de tierras (CAPECO) y la profundidad mínima usual de
// cimentación en suelos sin problemas especiales de la NTE E.050 (Art. 22).
//
// Este cálculo también lo reutilizan directamente los módulos de Zapatas, Cimiento
// Corrido y Vigas de Cimentación (ver calcularRellenoYEliminacion), para que cada uno
// pueda metrar su propio movimiento de tierras a partir de su propia geometría, sin
// duplicar la fórmula ni tener que volver a escribir los datos en este módulo.

export type TipoExcavacion = "zapata" | "zanja" | "general";

// "altura": la cimentación tiene el mismo largo x ancho ya ingresado arriba, y solo
// se pide su altura/peralte (cm) — el volumen se calcula solo, igual que ya hacen
// Zapatas, Cimiento Corrido y Vigas de Cimentación con su propia geometría.
// "volumen": para cimentaciones de forma irregular, se ingresa el volumen directo.
export type ModoVolumenCimentacion = "altura" | "volumen";

export interface MovimientoTierrasInput {
  tipoExcavacion: TipoExcavacion; // define si el sobreancho se aplica en 1 o 2 direcciones en planta
  largo: number; // m, longitud de la zanja (zanja/general) o largo del pozo (zapata)
  ancho: number; // m, ancho neto de la cimentación a excavar
  profundidad: number; // m, profundidad de excavación desde el nivel de terreno
  numeroExcavaciones: number; // und, número de zanjas/pozos iguales
  sobreanchoTrabajo: number; // cm, holgura por lado para encofrado y compactado (típico 10 cm)
  modoVolumenCimentacion: ModoVolumenCimentacion;
  alturaCimentacion: number; // cm, alto/peralte de la cimentación (modo "altura")
  volumenOcupadoCimentacion: number; // m3, volumen que ocupará el concreto de la cimentación (modo "volumen")
  porcentajeEsponjamiento: number; // %, esponjamiento del material excavado para eliminación (típico 25-30%)
}

export interface MovimientoTierrasResult {
  largoExcavacion: number; // m, largo + sobreancho (solo en modo "zapata")
  anchoExcavacion: number; // m, ancho + sobreancho de trabajo en ambos lados
  volumenExcavacion: number; // m3
  areaNivelacionFondo: number; // m2, refine y nivelación del fondo de excavación
  volumenOcupadoCimentacion: number; // m3, resuelto según el modo elegido (altura o volumen directo)
  volumenRelleno: number; // m3, relleno y compactado con material propio
  volumenEliminacion: number; // m3, material excedente en banco (sin esponjar)
  volumenEliminacionEsponjado: number; // m3, material excedente esponjado, para acarreo y eliminación
  warnings: string[];
}

export interface RellenoYEliminacionInput {
  volumenExcavacion: number; // m3
  volumenOcupadoCimentacion: number; // m3, volumen de concreto que desplaza al relleno
  porcentajeEsponjamiento: number; // %
}

export interface RellenoYEliminacionResult {
  volumenRelleno: number; // m3
  volumenEliminacion: number; // m3, en banco (sin esponjar)
  volumenEliminacionEsponjado: number; // m3
  warning?: string;
}

// Núcleo común a todo movimiento de tierras: una vez que se conoce el volumen
// excavado y el volumen que ocupará el concreto, el relleno y la eliminación se
// calculan igual sin importar la forma de la excavación (zanja continua o pozo
// aislado) — por eso se aísla aquí y lo reutilizan Zapatas, Cimiento Corrido y
// Vigas de Cimentación además del módulo independiente de Movimiento de Tierras.
export function calcularRellenoYEliminacion(input: RellenoYEliminacionInput): RellenoYEliminacionResult {
  const volumenExcavacion = Math.max(input.volumenExcavacion, 0);
  const volumenOcupado = Math.max(input.volumenOcupadoCimentacion, 0);

  const volumenRelleno = Math.max(volumenExcavacion - volumenOcupado, 0);
  const volumenEliminacion = Math.min(volumenOcupado, volumenExcavacion);
  const volumenEliminacionEsponjado = volumenEliminacion * (1 + Math.max(input.porcentajeEsponjamiento, 0) / 100);

  const warning =
    volumenOcupado > volumenExcavacion
      ? "El volumen ocupado por la cimentación es mayor al volumen excavado; revisa las dimensiones de la excavación."
      : undefined;

  return { volumenRelleno, volumenEliminacion, volumenEliminacionEsponjado, warning };
}

export function calcularMovimientoTierras(input: MovimientoTierrasInput): MovimientoTierrasResult {
  const warnings: string[] = [];

  const sobreanchoM = (Math.max(input.sobreanchoTrabajo, 0) * 2) / 100;
  const anchoExcavacion = Math.max(input.ancho, 0) + sobreanchoM;
  // En pozos aislados (zapatas) el sobreancho de trabajo aplica en las dos
  // direcciones en planta; en zanjas continuas (cimiento corrido, vigas de
  // cimentación) solo en el ancho, ya que el largo es la longitud del tramo.
  const largoExcavacion = input.tipoExcavacion === "zapata" ? Math.max(input.largo, 0) + sobreanchoM : Math.max(input.largo, 0);
  const numeroExcavaciones = Math.max(input.numeroExcavaciones, 0);

  const volumenExcavacion = anchoExcavacion * largoExcavacion * Math.max(input.profundidad, 0) * numeroExcavaciones;
  const areaNivelacionFondo = anchoExcavacion * largoExcavacion * numeroExcavaciones;

  // El volumen que ocupa la cimentación usa el largo x ancho ya ingresado arriba
  // (sin el sobreancho de trabajo, que es solo espacio para excavar/trabajar, no
  // parte del concreto), para que "por altura" refleje el elemento real.
  const volumenOcupadoCimentacion =
    input.modoVolumenCimentacion === "altura"
      ? Math.max(input.largo, 0) * Math.max(input.ancho, 0) * (Math.max(input.alturaCimentacion, 0) / 100) * numeroExcavaciones
      : Math.max(input.volumenOcupadoCimentacion, 0);

  const { volumenRelleno, volumenEliminacion, volumenEliminacionEsponjado, warning } = calcularRellenoYEliminacion({
    volumenExcavacion,
    volumenOcupadoCimentacion,
    porcentajeEsponjamiento: input.porcentajeEsponjamiento,
  });
  if (warning) warnings.push(warning);

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
    largoExcavacion,
    anchoExcavacion,
    volumenExcavacion,
    areaNivelacionFondo,
    volumenOcupadoCimentacion,
    volumenRelleno,
    volumenEliminacion,
    volumenEliminacionEsponjado,
    warnings,
  };
}
