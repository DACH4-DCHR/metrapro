import { CONCRETE_DENSITY_KG_M3, getRebar } from "../materials";

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
  warnings: string[];
}

function pesoMalla(
  largo: number,
  ancho: number,
  numeroZapatas: number,
  diametroXId: string,
  separacionX: number,
  diametroYId: string,
  separacionY: number
) {
  const separacionXM = separacionX / 100;
  const separacionYM = separacionY / 100;

  // Barras "X": corren paralelas al largo (longitud = largo), repetidas cada
  // "separacionX" a lo largo del ancho.
  const numeroBarrasX = separacionXM > 0 ? Math.ceil(ancho / separacionXM) : 0;
  const pesoX = numeroBarrasX * largo * numeroZapatas * getRebar(diametroXId).weightKgPerM;

  // Barras "Y": corren paralelas al ancho (longitud = ancho), repetidas cada
  // "separacionY" a lo largo del largo.
  const numeroBarrasY = separacionYM > 0 ? Math.ceil(largo / separacionYM) : 0;
  const pesoY = numeroBarrasY * ancho * numeroZapatas * getRebar(diametroYId).weightKgPerM;

  const longitudTotal = numeroBarrasX * largo * numeroZapatas + numeroBarrasY * ancho * numeroZapatas;

  return { numeroBarrasX, numeroBarrasY, peso: pesoX + pesoY, longitudTotal };
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

  const inferior = pesoMalla(
    input.largo,
    input.ancho,
    input.numeroZapatas,
    input.diametroInferiorXId,
    input.separacionInferiorX,
    input.diametroInferiorYId,
    input.separacionInferiorY
  );

  let superior = { numeroBarrasX: 0, numeroBarrasY: 0, peso: 0, longitudTotal: 0 };
  if (input.incluirMallaSuperior) {
    superior = pesoMalla(
      input.largo,
      input.ancho,
      input.numeroZapatas,
      input.diametroSuperiorXId,
      input.separacionSuperiorX,
      input.diametroSuperiorYId,
      input.separacionSuperiorY
    );
  }

  const pesoAceroTotal = inferior.peso + superior.peso;
  const longitudTotalFierro = inferior.longitudTotal + superior.longitudTotal;

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
    warnings,
  };
}
