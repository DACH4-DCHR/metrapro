import { CONCRETE_DENSITY_KG_M3, getRebar } from "../materials";
import type { AceroItem } from "./aceroResumen";
import { longitudGanchoBarra90 } from "./ganchos";
import { calcularRellenoYEliminacion } from "./movimientoTierras";

export interface ZapataInput {
  numeroZapatas: number;
  largo: number; // m (dirección X)
  ancho: number; // m (dirección Y)
  peralte: number; // cm
  recubrimiento: number; // cm

  // Malla inferior. "X" = barras paralelas al largo (corren en dirección X,
  // espaciadas a lo largo del ancho); "Y" = barras paralelas al ancho.
  diametroInferiorXId: string;
  separacionInferiorX: number; // cm
  diametroInferiorYId: string;
  separacionInferiorY: number; // cm

  incluirMallaSuperior: boolean;
  diametroSuperiorXId: string;
  separacionSuperiorX: number;
  diametroSuperiorYId: string;
  separacionSuperiorY: number;

  // Gancho estándar a 90° en los extremos de la malla (anclaje hacia el borde de la
  // zapata). Opcional: depende del detallado de cada proyecto.
  considerarGanchoLongitudinal: boolean;
  extremosConGancho: number; // 0, 1 ó 2 extremos por barra, si se considera

  // Movimiento de tierras: excavación del pozo de la zapata (sobreancho en las dos
  // direcciones en planta), relleno y compactado con material propio, y eliminación
  // del material excedente que desplaza el propio concreto de la zapata.
  incluirMovimientoTierras: boolean;
  profundidadExcavacion: number; // m, desde el nivel de terreno hasta el fondo de la zapata
  sobreanchoExcavacion: number; // cm, holgura por lado para encofrar y compactar (típico 10 cm)
  porcentajeEsponjamiento: number; // %, esponjamiento del material excedente (típico 25-30%)
}

export interface ZapataResult {
  areaPlanta: number; // m2
  volumenConcreto: number; // m3
  pesoConcreto: number; // kg
  encofradoM2: number;
  numeroBarrasInferiorX: number;
  numeroBarrasInferiorY: number;
  pesoMallaInferior: number; // kg
  numeroBarrasSuperiorX: number;
  numeroBarrasSuperiorY: number;
  pesoMallaSuperior: number; // kg
  pesoAceroTotal: number; // kg
  longitudTotalFierro: number; // m
  desgloseAcero: AceroItem[];
  // Movimiento de tierras (solo cuando incluirMovimientoTierras es true)
  largoExcavacion: number; // m
  anchoExcavacion: number; // m
  volumenExcavacion: number; // m3
  areaNivelacionFondo: number; // m2
  volumenRelleno: number; // m3
  volumenEliminacion: number; // m3
  volumenEliminacionEsponjado: number; // m3
  warnings: string[];
}

function pesoMalla(
  largo: number,
  ancho: number,
  numeroZapatas: number,
  diametroXId: string,
  separacionX: number,
  diametroYId: string,
  separacionY: number,
  extremosConGancho: number
) {
  const separacionXM = separacionX / 100;
  const separacionYM = separacionY / 100;

  // Barras "X": corren paralelas al largo, repetidas cada "separacionX" a lo largo del ancho.
  const numeroBarrasX = separacionXM > 0 ? Math.ceil(ancho / separacionXM) : 0;
  const longitudX = numeroBarrasX * (largo + extremosConGancho * longitudGanchoBarra90(diametroXId)) * numeroZapatas;
  const pesoX = longitudX * getRebar(diametroXId).weightKgPerM;

  // Barras "Y": corren paralelas al ancho, repetidas cada "separacionY" a lo largo del largo.
  const numeroBarrasY = separacionYM > 0 ? Math.ceil(largo / separacionYM) : 0;
  const longitudY = numeroBarrasY * (ancho + extremosConGancho * longitudGanchoBarra90(diametroYId)) * numeroZapatas;
  const pesoY = longitudY * getRebar(diametroYId).weightKgPerM;

  const longitudTotal = longitudX + longitudY;

  return { numeroBarrasX, numeroBarrasY, longitudX, longitudY, peso: pesoX + pesoY, longitudTotal };
}

export function calcularZapata(input: ZapataInput): ZapataResult {
  const warnings: string[] = [];
  const peralteM = input.peralte / 100;

  const areaPlanta = input.largo * input.ancho;
  const volumenConcreto = areaPlanta * peralteM * input.numeroZapatas;
  const pesoConcreto = volumenConcreto * CONCRETE_DENSITY_KG_M3;
  const encofradoM2 = 2 * (input.largo + input.ancho) * peralteM * input.numeroZapatas;

  if (input.peralte < 30) {
    warnings.push(
      "El peralte es menor a 30 cm, el mínimo para zapatas apoyadas sobre el suelo según E.060 Art. 15.8.1.1."
    );
  }
  if (input.recubrimiento < 7.5) {
    warnings.push(
      "El recubrimiento es menor a 7.5 cm, el mínimo para concreto vaciado contra el suelo según E.060 Art. 7.7.1(a)."
    );
  }

  const extremosConGancho = input.considerarGanchoLongitudinal ? Math.max(Math.min(input.extremosConGancho, 2), 0) : 0;

  const inferior = pesoMalla(
    input.largo,
    input.ancho,
    input.numeroZapatas,
    input.diametroInferiorXId,
    input.separacionInferiorX,
    input.diametroInferiorYId,
    input.separacionInferiorY,
    extremosConGancho
  );

  let superior = { numeroBarrasX: 0, numeroBarrasY: 0, longitudX: 0, longitudY: 0, peso: 0, longitudTotal: 0 };
  if (input.incluirMallaSuperior) {
    superior = pesoMalla(
      input.largo,
      input.ancho,
      input.numeroZapatas,
      input.diametroSuperiorXId,
      input.separacionSuperiorX,
      input.diametroSuperiorYId,
      input.separacionSuperiorY,
      extremosConGancho
    );
  }

  const pesoAceroTotal = inferior.peso + superior.peso;
  const longitudTotalFierro = inferior.longitudTotal + superior.longitudTotal;

  const desgloseAcero: AceroItem[] = [
    { diametroId: input.diametroInferiorXId, longitudM: inferior.longitudX },
    { diametroId: input.diametroInferiorYId, longitudM: inferior.longitudY },
    ...(input.incluirMallaSuperior
      ? [
          { diametroId: input.diametroSuperiorXId, longitudM: superior.longitudX },
          { diametroId: input.diametroSuperiorYId, longitudM: superior.longitudY },
        ]
      : []),
  ];

  // Movimiento de tierras: el pozo de cada zapata es más ancho y más largo que la
  // propia zapata (sobreancho de trabajo en las dos direcciones en planta), y el
  // volumen que desplaza el relleno es exactamente el volumen de concreto ya
  // calculado arriba (no se le vuelve a pedir al usuario).
  const sobreanchoM = (Math.max(input.sobreanchoExcavacion, 0) * 2) / 100;
  const largoExcavacion = input.incluirMovimientoTierras ? input.largo + sobreanchoM : 0;
  const anchoExcavacion = input.incluirMovimientoTierras ? input.ancho + sobreanchoM : 0;
  const volumenExcavacion = input.incluirMovimientoTierras
    ? largoExcavacion * anchoExcavacion * Math.max(input.profundidadExcavacion, 0) * input.numeroZapatas
    : 0;
  const areaNivelacionFondo = input.incluirMovimientoTierras ? largoExcavacion * anchoExcavacion * input.numeroZapatas : 0;
  const { volumenRelleno, volumenEliminacion, volumenEliminacionEsponjado, warning: warningRelleno } =
    calcularRellenoYEliminacion({
      volumenExcavacion,
      volumenOcupadoCimentacion: volumenConcreto,
      porcentajeEsponjamiento: input.porcentajeEsponjamiento,
    });
  if (input.incluirMovimientoTierras && warningRelleno) warnings.push(warningRelleno);
  if (input.incluirMovimientoTierras && input.profundidadExcavacion < peralteM) {
    warnings.push("La profundidad de excavación debe ser al menos igual al peralte de la zapata.");
  }

  return {
    areaPlanta,
    volumenConcreto,
    pesoConcreto,
    encofradoM2,
    numeroBarrasInferiorX: inferior.numeroBarrasX,
    numeroBarrasInferiorY: inferior.numeroBarrasY,
    pesoMallaInferior: inferior.peso,
    numeroBarrasSuperiorX: superior.numeroBarrasX,
    numeroBarrasSuperiorY: superior.numeroBarrasY,
    pesoMallaSuperior: superior.peso,
    pesoAceroTotal,
    longitudTotalFierro,
    desgloseAcero,
    largoExcavacion,
    anchoExcavacion,
    volumenExcavacion,
    areaNivelacionFondo,
    volumenRelleno,
    volumenEliminacion,
    volumenEliminacionEsponjado,
    warnings,
  };
}
