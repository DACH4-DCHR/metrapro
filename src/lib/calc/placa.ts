import { getRebar } from "../materials";
import type { BarraGrupo } from "./viga";
import type { AceroItem } from "./aceroResumen";

export type { BarraGrupo };
export type TipoPlaca = "estructural" | "ductilidad_limitada";

export interface PlacaInput {
  numeroMuros: number;
  longitud: number; // m
  alturaLibre: number; // m
  espesor: number; // cm
  tipoMuro: TipoPlaca;
  numeroCapas: 1 | 2;

  diametroHorizontalId: string;
  separacionHorizontal: number; // cm
  diametroVerticalId: string;
  separacionVertical: number; // cm

  incluirElementoBorde: boolean;
  anchoElementoBorde: number; // cm, a lo largo del muro, por extremo
  barrasElementoBorde: BarraGrupo[]; // por extremo
  diametroEstribosBordeId: string;
  separacionEstribosBorde: number; // cm
  recubrimiento: number; // cm
}

export interface PlacaResult {
  areaMuro: number; // m2, una cara
  volumenConcreto: number; // m3
  areaEncofrado: number; // m2, ambas caras
  espesorMinimoCm: number;
  numeroBarrasHorizontales: number;
  pesoAceroHorizontal: number; // kg
  cuantiaHorizontal: number;
  numeroBarrasVerticales: number;
  pesoAceroVertical: number; // kg
  cuantiaVertical: number;
  numeroBarrasElementoBorde: number; // por extremo
  pesoAceroElementoBorde: number; // kg
  numeroEstribosElementoBorde: number; // por extremo, por muro
  pesoEstribosElementoBorde: number; // kg
  pesoAceroTotal: number; // kg
  longitudTotalFierro: number; // m
  separacionMaximaSugeridaCm: number; // 3×espesor, máx. 40 cm (Art. 21.9.4.3 / 11.10.7)
  separacionMaximaEstribosBordeCm: number; // mín(6·db, 10 cm) — Art. 21.9.7.6 / 21.6.4.5
  desgloseAcero: AceroItem[];
  warnings: string[];
}

const GANCHO_ESTRIBO_M = 0.2;

function barAreaCm2(diametroMm: number): number {
  const dCm = diametroMm / 10;
  return (Math.PI * dCm * dCm) / 4;
}

export function calcularPlaca(input: PlacaInput): PlacaResult {
  const warnings: string[] = [];
  const espesorM = input.espesor / 100;
  const recubM = input.recubrimiento / 100;

  const areaMuro = input.longitud * input.alturaLibre;
  const volumenConcreto = espesorM * areaMuro * input.numeroMuros;
  const areaEncofrado = 2 * areaMuro * input.numeroMuros;

  const espesorMinimoCm =
    input.tipoMuro === "ductilidad_limitada"
      ? Math.max((input.alturaLibre * 100) / 25, 10)
      : Math.max((input.alturaLibre * 100) / 20, 15);

  if (input.espesor < espesorMinimoCm) {
    warnings.push(
      `El espesor (${input.espesor} cm) es menor al mínimo de ${espesorMinimoCm.toFixed(1)} cm (${
        input.tipoMuro === "ductilidad_limitada" ? "altura libre/25, E.060 Art. 21.9.3.3" : "altura libre/20, E.060 Art. 21.9.3.2"
      }).`
    );
  }

  const separacionMaximaSugeridaCm = Math.min(3 * input.espesor, 40);

  const rebarH = getRebar(input.diametroHorizontalId);
  const separacionHM = input.separacionHorizontal / 100;
  const numeroBarrasHorizontales = separacionHM > 0 ? Math.ceil(input.alturaLibre / separacionHM) : 0;
  const pesoAceroHorizontal = numeroBarrasHorizontales * input.longitud * input.numeroMuros * rebarH.weightKgPerM * input.numeroCapas;
  const cuantiaHorizontal =
    input.espesor > 0 && input.separacionHorizontal > 0
      ? (barAreaCm2(rebarH.diameterMm) * input.numeroCapas) / (input.espesor * input.separacionHorizontal)
      : 0;

  const rebarV = getRebar(input.diametroVerticalId);
  const separacionVM = input.separacionVertical / 100;
  const numeroBarrasVerticales = separacionVM > 0 ? Math.ceil(input.longitud / separacionVM) : 0;
  const pesoAceroVertical = numeroBarrasVerticales * input.alturaLibre * input.numeroMuros * rebarV.weightKgPerM * input.numeroCapas;
  const cuantiaVertical =
    input.espesor > 0 && input.separacionVertical > 0
      ? (barAreaCm2(rebarV.diameterMm) * input.numeroCapas) / (input.espesor * input.separacionVertical)
      : 0;

  if (cuantiaHorizontal < 0.002) {
    warnings.push(
      `La cuantía horizontal (${cuantiaHorizontal.toFixed(4)}) es menor al mínimo de 0,002 (E.060 Art. 11.10.7a / 21.9.4.1).`
    );
  }
  if (cuantiaVertical < 0.0015) {
    warnings.push(
      `La cuantía vertical (${cuantiaVertical.toFixed(4)}) es menor al mínimo de 0,0015 (E.060 Art. 11.10.7b / 21.9.4.1).`
    );
  }
  if (input.separacionHorizontal > separacionMaximaSugeridaCm) {
    warnings.push(
      `La separación horizontal supera el máximo de ${separacionMaximaSugeridaCm.toFixed(0)} cm (mín. entre 3×espesor y 40 cm, E.060 Art. 21.9.4.3).`
    );
  }
  if (input.separacionVertical > separacionMaximaSugeridaCm) {
    warnings.push(
      `La separación vertical supera el máximo de ${separacionMaximaSugeridaCm.toFixed(0)} cm (mín. entre 3×espesor y 40 cm, E.060 Art. 21.9.4.3).`
    );
  }
  if (input.espesor >= 20 && input.numeroCapas === 1) {
    warnings.push(
      "El espesor es mayor o igual a 20 cm; debe usarse refuerzo en dos capas, una por cada cara (E.060 Art. 21.9.4.3a)."
    );
  }
  if (cuantiaVertical > 0.01) {
    warnings.push(
      "La cuantía vertical supera 0,01; el refuerzo vertical distribuido debe estar confinado por estribos (E.060 Art. 21.9.4.4)."
    );
  }

  const gruposBorde = input.barrasElementoBorde;
  const numeroBarrasElementoBorde = input.incluirElementoBorde
    ? gruposBorde.reduce((acc, g) => acc + Math.max(g.cantidad, 0), 0)
    : 0;
  const dbMinBordeMm =
    gruposBorde.filter((g) => g.cantidad > 0).map((g) => getRebar(g.diametroId).diameterMm).reduce((a, b) => Math.min(a, b), Infinity) ||
    16;
  const separacionMaximaEstribosBordeCm = Math.min(6 * (dbMinBordeMm / 10), 10);

  let pesoAceroElementoBorde = 0;
  let numeroEstribosElementoBorde = 0;
  let pesoEstribosElementoBorde = 0;
  let longitudTotalEstribosBorde = 0;

  if (input.incluirElementoBorde) {
    pesoAceroElementoBorde = gruposBorde.reduce(
      (acc, g) =>
        acc + Math.max(g.cantidad, 0) * input.alturaLibre * 2 * input.numeroMuros * getRebar(g.diametroId).weightKgPerM,
      0
    );

    if (numeroBarrasElementoBorde === 0) {
      warnings.push("Debe indicar al menos un grupo de acero longitudinal en el elemento de borde.");
    }
    if (input.separacionEstribosBorde > separacionMaximaEstribosBordeCm) {
      warnings.push(
        `La separación de estribos en el elemento de borde supera el máximo de ${separacionMaximaEstribosBordeCm.toFixed(
          1
        )} cm (mín. entre 6·db y 10 cm, E.060 Art. 21.9.7.6 / 21.6.4.5).`
      );
    }

    const rebarEstriboBorde = getRebar(input.diametroEstribosBordeId);
    const separacionEstriboBordeM = input.separacionEstribosBorde / 100;
    const numeroEstribosPorExtremo = separacionEstriboBordeM > 0 ? Math.floor(input.alturaLibre / separacionEstriboBordeM) + 1 : 0;
    numeroEstribosElementoBorde = numeroEstribosPorExtremo;
    const longitudPorEstribo =
      2 * (input.anchoElementoBorde / 100 - 2 * recubM) + 2 * (espesorM - 2 * recubM) + GANCHO_ESTRIBO_M;
    const numeroEstribosTotal = numeroEstribosPorExtremo * 2 * input.numeroMuros;
    longitudTotalEstribosBorde = longitudPorEstribo * numeroEstribosTotal;
    pesoEstribosElementoBorde = longitudTotalEstribosBorde * rebarEstriboBorde.weightKgPerM;
  }

  const pesoAceroTotal = pesoAceroHorizontal + pesoAceroVertical + pesoAceroElementoBorde + pesoEstribosElementoBorde;
  const longitudTotalFierro =
    numeroBarrasHorizontales * input.longitud * input.numeroMuros * input.numeroCapas +
    numeroBarrasVerticales * input.alturaLibre * input.numeroMuros * input.numeroCapas +
    numeroBarrasElementoBorde * input.alturaLibre * 2 * input.numeroMuros +
    longitudTotalEstribosBorde;

  if (input.recubrimiento * 2 >= input.espesor) {
    warnings.push("El recubrimiento indicado es demasiado grande respecto al espesor del muro.");
  }

  const desgloseAcero: AceroItem[] = [
    {
      diametroId: input.diametroHorizontalId,
      longitudM: numeroBarrasHorizontales * input.longitud * input.numeroMuros * input.numeroCapas,
    },
    {
      diametroId: input.diametroVerticalId,
      longitudM: numeroBarrasVerticales * input.alturaLibre * input.numeroMuros * input.numeroCapas,
    },
    ...(input.incluirElementoBorde
      ? [
          ...gruposBorde.map((g) => ({
            diametroId: g.diametroId,
            longitudM: Math.max(g.cantidad, 0) * input.alturaLibre * 2 * input.numeroMuros,
          })),
          { diametroId: input.diametroEstribosBordeId, longitudM: longitudTotalEstribosBorde },
        ]
      : []),
  ];

  return {
    areaMuro,
    volumenConcreto,
    areaEncofrado,
    espesorMinimoCm,
    numeroBarrasHorizontales,
    pesoAceroHorizontal,
    cuantiaHorizontal,
    numeroBarrasVerticales,
    pesoAceroVertical,
    cuantiaVertical,
    numeroBarrasElementoBorde,
    pesoAceroElementoBorde,
    numeroEstribosElementoBorde,
    pesoEstribosElementoBorde,
    pesoAceroTotal,
    longitudTotalFierro,
    separacionMaximaSugeridaCm,
    separacionMaximaEstribosBordeCm,
    desgloseAcero,
    warnings,
  };
}
