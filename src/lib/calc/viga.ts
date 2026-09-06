import { getRebar } from "../materials";

export type TipoSeccionViga = "rectangular" | "T" | "personalizada";

export interface VigaInput {
  numeroVigas: number;
  longitud: number; // m
  base: number; // cm
  altura: number; // cm
  tipoSeccion: TipoSeccionViga;
  // Sección T invertida
  alaAncho?: number; // cm
  alaEspesor?: number; // cm
  // Sección personalizada
  areaSeccionPersonalizada?: number; // m2
  perimetroEncofradoPersonalizado?: number; // m

  // Acero
  diametroLongitudinalId: string;
  numeroBarrasLongitudinales: number;
  diametroEstribosId: string;
  separacionEstribos: number; // cm
  recubrimiento: number; // cm
}

export interface VigaResult {
  areaSeccion: number; // m2
  volumenConcreto: number; // m3
  perimetroEncofrado: number; // m
  areaEncofrado: number; // m2
  longitudBarraLongitudinal: number; // m (por barra, incluye viga completa)
  longitudTotalBarrasLongitudinales: number; // m
  pesoAceroLongitudinal: number; // kg
  numeroEstribosPorViga: number;
  numeroEstribosTotal: number;
  longitudPorEstribo: number; // m
  longitudTotalEstribos: number; // m
  pesoEstribos: number; // kg
  pesoAceroTotal: number; // kg
  longitudTotalFierro: number; // m
  warnings: string[];
}

const GANCHO_ESTRIBO_M = 0.2; // longitud adicional por ganchos a 135°, referencial

export function calcularViga(input: VigaInput): VigaResult {
  const warnings: string[] = [];
  const baseM = input.base / 100;
  const alturaM = input.altura / 100;
  const recubM = input.recubrimiento / 100;

  let areaSeccion: number;
  let perimetroEncofrado: number;

  if (input.tipoSeccion === "rectangular") {
    areaSeccion = baseM * alturaM;
    perimetroEncofrado = 2 * alturaM + baseM; // 2 caras laterales + fondo
  } else if (input.tipoSeccion === "T") {
    const alaAnchoM = (input.alaAncho ?? input.base) / 100;
    const alaEspesorM = (input.alaEspesor ?? 0) / 100;
    const almaAlturaM = Math.max(alturaM - alaEspesorM, 0);
    areaSeccion = baseM * almaAlturaM + alaAnchoM * alaEspesorM;
    perimetroEncofrado = 2 * almaAlturaM + baseM; // encofrado típico de alma vista, ala apoya en losa
  } else {
    areaSeccion = input.areaSeccionPersonalizada ?? 0;
    perimetroEncofrado = input.perimetroEncofradoPersonalizado ?? 0;
    if (!areaSeccion) warnings.push("Debe indicar el área de sección personalizada.");
  }

  const volumenConcreto = areaSeccion * input.longitud * input.numeroVigas;
  const areaEncofrado = perimetroEncofrado * input.longitud * input.numeroVigas;

  const rebarLong = getRebar(input.diametroLongitudinalId);
  const longitudBarraLongitudinal = input.longitud; // referencial, sin longitud de anclaje/traslape
  const longitudTotalBarrasLongitudinales =
    longitudBarraLongitudinal * input.numeroBarrasLongitudinales * input.numeroVigas;
  const pesoAceroLongitudinal = longitudTotalBarrasLongitudinales * rebarLong.weightKgPerM;

  const rebarEstribo = getRebar(input.diametroEstribosId);
  const separacionEstribosM = input.separacionEstribos / 100;
  const numeroEstribosPorViga =
    separacionEstribosM > 0 ? Math.floor(input.longitud / separacionEstribosM) + 1 : 0;
  const numeroEstribosTotal = numeroEstribosPorViga * input.numeroVigas;
  const longitudPorEstribo =
    2 * (baseM - 2 * recubM) + 2 * (alturaM - 2 * recubM) + GANCHO_ESTRIBO_M;
  const longitudTotalEstribos = longitudPorEstribo * numeroEstribosTotal;
  const pesoEstribos = longitudTotalEstribos * rebarEstribo.weightKgPerM;

  const pesoAceroTotal = pesoAceroLongitudinal + pesoEstribos;
  const longitudTotalFierro = longitudTotalBarrasLongitudinales + longitudTotalEstribos;

  if (input.recubrimiento * 2 >= Math.min(input.base, input.altura)) {
    warnings.push("El recubrimiento indicado es demasiado grande respecto a la sección de la viga.");
  }

  return {
    areaSeccion,
    volumenConcreto,
    perimetroEncofrado,
    areaEncofrado,
    longitudBarraLongitudinal,
    longitudTotalBarrasLongitudinales,
    pesoAceroLongitudinal,
    numeroEstribosPorViga,
    numeroEstribosTotal,
    longitudPorEstribo,
    longitudTotalEstribos,
    pesoEstribos,
    pesoAceroTotal,
    longitudTotalFierro,
    warnings,
  };
}
