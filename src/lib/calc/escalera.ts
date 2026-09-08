import { getRebar } from "../materials";
import type { AceroItem } from "./aceroResumen";

export type TipoEscalera = "un_tramo" | "dos_tramos" | "L" | "U";

export interface DescansoInput {
  ancho: number; // m
  largo: number; // m
  espesor: number; // cm
}

export interface TramoInput {
  numeroPeldanos: number;
  huella: number; // cm
  contrahuella: number; // cm
}

export interface EscaleraInput {
  tipo: TipoEscalera;
  alturaEntrePisos: number; // m
  anchoEscalera: number; // m
  espesorLosaInclinada: number; // cm (garganta)
  tramo1: TramoInput;
  tramo2?: TramoInput; // requerido si tipo != un_tramo
  descanso?: DescansoInput; // requerido si tipo != un_tramo

  aceroPrincipalDiametroId: string;
  aceroPrincipalSeparacion: number; // cm
  aceroDistribucionDiametroId: string;
  aceroDistribucionSeparacion: number; // cm
}

export interface TramoResultado {
  desarrolloHorizontal: number;
  contrahuellaCalculada: number;
  longitudInclinada: number;
  areaGarganta: number;
  volumenGarganta: number;
  volumenPeldanos: number;
  volumenConcreto: number;
  encofradoFondo: number;
  encofradoContrahuellas: number;
  encofradoTotal: number;
}

export interface EscaleraResult {
  tramo1: TramoResultado;
  tramo2?: TramoResultado;
  volumenDescanso: number;
  encofradoDescanso: number;
  areaEscaleraTotal: number;
  volumenConcretoTotal: number;
  encofradoTotal: number;
  aceroPrincipalKg: number;
  aceroDistribucionKg: number;
  aceroTotalKg: number;
  desgloseAcero: AceroItem[];
  warnings: string[];
}

function calcularTramo(
  tramo: TramoInput,
  ancho: number,
  alturaReferencia: number,
  espesorGarganta: number,
  warnings: string[],
  etiqueta: string
): TramoResultado {
  const espesorGargantaM = espesorGarganta / 100;
  const huellaM = tramo.huella / 100;
  const contrahuellaM = tramo.contrahuella / 100;

  const desarrolloHorizontal = (tramo.numeroPeldanos - 1) * huellaM;
  const alturaTramo = tramo.numeroPeldanos * contrahuellaM;
  const contrahuellaCalculada = alturaReferencia > 0 ? alturaReferencia / tramo.numeroPeldanos : contrahuellaM;

  if (Math.abs(alturaTramo - alturaReferencia) > 0.02 && alturaReferencia > 0) {
    warnings.push(
      `${etiqueta}: la altura resultante (Nº peldaños × contrahuella = ${alturaTramo.toFixed(
        2
      )} m) no coincide con la altura entre pisos indicada (${alturaReferencia.toFixed(2)} m).`
    );
  }

  const longitudInclinada = Math.sqrt(desarrolloHorizontal ** 2 + alturaTramo ** 2);
  const areaGarganta = longitudInclinada * ancho;
  const volumenGarganta = espesorGargantaM * longitudInclinada * ancho;
  const volumenPeldanos = tramo.numeroPeldanos * ((huellaM * contrahuellaM) / 2) * ancho;
  const volumenConcreto = volumenGarganta + volumenPeldanos;

  const encofradoFondo = areaGarganta;
  const encofradoContrahuellas = tramo.numeroPeldanos * contrahuellaM * ancho;
  const encofradoTotal = encofradoFondo + encofradoContrahuellas;

  return {
    desarrolloHorizontal,
    contrahuellaCalculada,
    longitudInclinada,
    areaGarganta,
    volumenGarganta,
    volumenPeldanos,
    volumenConcreto,
    encofradoFondo,
    encofradoContrahuellas,
    encofradoTotal,
  };
}

export function calcularEscalera(input: EscaleraInput): EscaleraResult {
  const warnings: string[] = [];
  const esMultiTramo = input.tipo !== "un_tramo";

  const alturaTramo1 = esMultiTramo ? input.alturaEntrePisos / 2 : input.alturaEntrePisos;
  const tramo1 = calcularTramo(
    input.tramo1,
    input.anchoEscalera,
    alturaTramo1,
    input.espesorLosaInclinada,
    warnings,
    "Tramo 1"
  );

  let tramo2: TramoResultado | undefined;
  let volumenDescanso = 0;
  let encofradoDescanso = 0;
  let areaDescanso = 0;

  if (esMultiTramo) {
    if (!input.tramo2) {
      warnings.push("Debe completar los datos del Tramo 2 para este tipo de escalera.");
    } else {
      tramo2 = calcularTramo(
        input.tramo2,
        input.anchoEscalera,
        input.alturaEntrePisos / 2,
        input.espesorLosaInclinada,
        warnings,
        "Tramo 2"
      );
    }
    if (!input.descanso) {
      warnings.push("Debe completar las dimensiones del descanso (landing) para este tipo de escalera.");
    } else {
      volumenDescanso = input.descanso.ancho * input.descanso.largo * (input.descanso.espesor / 100);
      encofradoDescanso = input.descanso.ancho * input.descanso.largo;
      areaDescanso = input.descanso.ancho * input.descanso.largo;
    }
  }

  const areaEscaleraTotal = tramo1.areaGarganta + (tramo2?.areaGarganta ?? 0) + areaDescanso;
  const volumenConcretoTotal = tramo1.volumenConcreto + (tramo2?.volumenConcreto ?? 0) + volumenDescanso;
  const encofradoTotal = tramo1.encofradoTotal + (tramo2?.encofradoTotal ?? 0) + encofradoDescanso;

  const rebarPrincipal = getRebar(input.aceroPrincipalDiametroId);
  const separacionPrincipalM = input.aceroPrincipalSeparacion / 100;
  const longitudInclinadaTotal = tramo1.longitudInclinada + (tramo2?.longitudInclinada ?? 0);
  const numeroBarrasPrincipal =
    separacionPrincipalM > 0 ? Math.ceil(input.anchoEscalera / separacionPrincipalM) : 0;
  const aceroPrincipalKg = numeroBarrasPrincipal * longitudInclinadaTotal * rebarPrincipal.weightKgPerM;

  const rebarDistribucion = getRebar(input.aceroDistribucionDiametroId);
  const separacionDistribucionM = input.aceroDistribucionSeparacion / 100;
  const numeroBarrasDistribucion =
    separacionDistribucionM > 0 ? Math.ceil(longitudInclinadaTotal / separacionDistribucionM) : 0;
  const aceroDistribucionKg = numeroBarrasDistribucion * input.anchoEscalera * rebarDistribucion.weightKgPerM;

  const aceroTotalKg = aceroPrincipalKg + aceroDistribucionKg;

  const desgloseAcero: AceroItem[] = [
    { diametroId: input.aceroPrincipalDiametroId, longitudM: numeroBarrasPrincipal * longitudInclinadaTotal },
    { diametroId: input.aceroDistribucionDiametroId, longitudM: numeroBarrasDistribucion * input.anchoEscalera },
  ];

  return {
    tramo1,
    tramo2,
    volumenDescanso,
    encofradoDescanso,
    areaEscaleraTotal,
    volumenConcretoTotal,
    encofradoTotal,
    aceroPrincipalKg,
    aceroDistribucionKg,
    aceroTotalKg,
    desgloseAcero,
    warnings,
  };
}
