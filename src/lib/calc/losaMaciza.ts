import { CONCRETE_DENSITY_KG_M3, getRebar } from "../materials";
import type { AceroItem } from "./aceroResumen";

export type TipoApoyoLosaMaciza = "simple" | "un_extremo_continuo" | "ambos_continuos" | "voladizo";

export interface LosaMacizaInput {
  largo: number; // m (dirección de la luz principal, X)
  ancho: number; // m (dirección perpendicular, Y)
  espesor: number; // cm
  tipoApoyo: TipoApoyoLosaMaciza;

  diametroPrincipalId: string; // Ø barras X (principales), paralelas al largo
  separacionPrincipal: number; // cm
  diametroTemperaturaId: string; // Ø barras Y (temperatura/repartición), paralelas al ancho
  separacionTemperatura: number; // cm

  incluirMallaSuperior: boolean;
  diametroPrincipalSupId: string;
  separacionPrincipalSup: number;
  diametroTemperaturaSupId: string;
  separacionTemperaturaSup: number;
}

export interface LosaMacizaResult {
  areaLosa: number; // m2
  volumenConcreto: number; // m3
  pesoConcreto: number; // kg
  encofradoM2: number; // m2
  espesorMinimoCm: number;
  numeroBarrasPrincipalInf: number;
  numeroBarrasTemperaturaInf: number;
  pesoMallaInferior: number; // kg
  numeroBarrasPrincipalSup: number;
  numeroBarrasTemperaturaSup: number;
  pesoMallaSuperior: number; // kg
  pesoAceroTotal: number; // kg
  longitudTotalFierro: number; // m
  cuantiaTemperatura: number;
  separacionMaximaCm: number; // mín(3×espesor, 40 cm)
  desgloseAcero: AceroItem[];
  warnings: string[];
}

// Divisores de la luz para el peralte mínimo (Tabla 9.1, losas macizas armadas en una
// dirección, concreto de peso normal y fy=4200 kg/cm²). "largo" se toma como la luz de
// cálculo en la dirección principal.
const DIVISOR_ESPESOR: Record<TipoApoyoLosaMaciza, number> = {
  simple: 20,
  un_extremo_continuo: 24,
  ambos_continuos: 28,
  voladizo: 10,
};

function barAreaCm2(diametroMm: number): number {
  const dCm = diametroMm / 10;
  return (Math.PI * dCm * dCm) / 4;
}

function pesoMalla(
  largo: number,
  ancho: number,
  diametroXId: string,
  separacionX: number,
  diametroYId: string,
  separacionY: number
) {
  const separacionXM = separacionX / 100;
  const separacionYM = separacionY / 100;

  // Barras "X": corren paralelas al largo, repetidas cada "separacionX" a lo largo del ancho.
  const numeroBarrasX = separacionXM > 0 ? Math.ceil(ancho / separacionXM) : 0;
  const longitudX = numeroBarrasX * largo;
  const pesoX = longitudX * getRebar(diametroXId).weightKgPerM;

  // Barras "Y": corren paralelas al ancho, repetidas cada "separacionY" a lo largo del largo.
  const numeroBarrasY = separacionYM > 0 ? Math.ceil(largo / separacionYM) : 0;
  const longitudY = numeroBarrasY * ancho;
  const pesoY = longitudY * getRebar(diametroYId).weightKgPerM;

  const longitudTotal = longitudX + longitudY;

  return { numeroBarrasX, numeroBarrasY, longitudX, longitudY, peso: pesoX + pesoY, longitudTotal };
}

export function calcularLosaMaciza(input: LosaMacizaInput): LosaMacizaResult {
  const warnings: string[] = [];
  const espesorM = input.espesor / 100;

  const areaLosa = input.largo * input.ancho;
  const volumenConcreto = areaLosa * espesorM;
  const pesoConcreto = volumenConcreto * CONCRETE_DENSITY_KG_M3;
  const encofradoM2 = areaLosa;

  const espesorMinimoCm = (input.largo * 100) / DIVISOR_ESPESOR[input.tipoApoyo];
  if (input.espesor < espesorMinimoCm) {
    warnings.push(
      `El espesor (${input.espesor} cm) es menor al mínimo de ${espesorMinimoCm.toFixed(1)} cm para no verificar deflexiones (Tabla 9.1, E.060 Art. 9.6.2.1).`
    );
  }

  const separacionMaximaCm = Math.min(3 * input.espesor, 40);
  if (input.separacionTemperatura > separacionMaximaCm) {
    warnings.push(
      `La separación del refuerzo de temperatura supera el máximo de ${separacionMaximaCm.toFixed(0)} cm (mín. entre 3×espesor y 40 cm, E.060 Art. 9.7.3).`
    );
  }

  const cuantiaTemperatura =
    input.espesor > 0 && input.separacionTemperatura > 0
      ? barAreaCm2(getRebar(input.diametroTemperaturaId).diameterMm) / (input.espesor * input.separacionTemperatura)
      : 0;
  if (cuantiaTemperatura < 0.0018) {
    warnings.push(
      `La cuantía de temperatura (${cuantiaTemperatura.toFixed(4)}) es menor al mínimo de 0,0018 (E.060 Art. 9.7.2, barras con fy=4200 kg/cm²).`
    );
  }

  const inferior = pesoMalla(
    input.largo,
    input.ancho,
    input.diametroPrincipalId,
    input.separacionPrincipal,
    input.diametroTemperaturaId,
    input.separacionTemperatura
  );

  let superior = { numeroBarrasX: 0, numeroBarrasY: 0, longitudX: 0, longitudY: 0, peso: 0, longitudTotal: 0 };
  if (input.incluirMallaSuperior) {
    superior = pesoMalla(
      input.largo,
      input.ancho,
      input.diametroPrincipalSupId,
      input.separacionPrincipalSup,
      input.diametroTemperaturaSupId,
      input.separacionTemperaturaSup
    );
  }

  const pesoAceroTotal = inferior.peso + superior.peso;
  const longitudTotalFierro = inferior.longitudTotal + superior.longitudTotal;

  const desgloseAcero: AceroItem[] = [
    { diametroId: input.diametroPrincipalId, longitudM: inferior.longitudX },
    { diametroId: input.diametroTemperaturaId, longitudM: inferior.longitudY },
    ...(input.incluirMallaSuperior
      ? [
          { diametroId: input.diametroPrincipalSupId, longitudM: superior.longitudX },
          { diametroId: input.diametroTemperaturaSupId, longitudM: superior.longitudY },
        ]
      : []),
  ];

  return {
    areaLosa,
    volumenConcreto,
    pesoConcreto,
    encofradoM2,
    espesorMinimoCm,
    numeroBarrasPrincipalInf: inferior.numeroBarrasX,
    numeroBarrasTemperaturaInf: inferior.numeroBarrasY,
    pesoMallaInferior: inferior.peso,
    numeroBarrasPrincipalSup: superior.numeroBarrasX,
    numeroBarrasTemperaturaSup: superior.numeroBarrasY,
    pesoMallaSuperior: superior.peso,
    pesoAceroTotal,
    longitudTotalFierro,
    cuantiaTemperatura,
    separacionMaximaCm,
    desgloseAcero,
    warnings,
  };
}
