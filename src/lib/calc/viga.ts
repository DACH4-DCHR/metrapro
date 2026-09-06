import { getRebar } from "../materials";

export type TipoSeccionViga = "rectangular" | "T" | "personalizada";
export type SistemaSismorresistente = "muros" | "porticos_dual";

export interface BarraGrupo {
  diametroId: string;
  cantidad: number;
}

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

  // Acero longitudinal: varios grupos para diámetros variables (ej. bastones, refuerzo
  // adicional en apoyos) en vez de un único diámetro para toda la viga.
  barrasLongitudinales: BarraGrupo[];
  diametroEstribosId: string;
  separacionEstribos: number; // cm (zona central, o única si no hay confinamiento)
  recubrimiento: number; // cm

  // Estribos de confinamiento (E.060, vigas sismorresistentes)
  incluirConfinamiento: boolean;
  sistemaSismorresistente: SistemaSismorresistente;
  longitudConfinamiento: number; // cm (Lo), medida desde la cara del apoyo, por extremo
  separacionConfinamiento: number; // cm (S1), dentro de la zona de confinamiento

  // Acero de piel (armadura de piel en el alma, E.060 10.5.4 / ACI 318 9.7.2.3)
  incluirAceroPiel: boolean;
  pielDiametroId: string;
  pielNumeroBarras: number; // total, ambas caras del alma
}

export interface VigaResult {
  areaSeccion: number; // m2
  volumenConcreto: number; // m3
  perimetroEncofrado: number; // m
  areaEncofrado: number; // m2
  numeroBarrasLongitudinales: number; // suma de todos los grupos, por viga
  longitudTotalBarrasLongitudinales: number; // m
  pesoAceroLongitudinal: number; // kg
  numeroEstribosConfinamientoPorExtremo: number; // por extremo (multiplicar x2 para ambos extremos)
  numeroEstribosCentralPorViga: number;
  numeroEstribosPorViga: number;
  numeroEstribosTotal: number;
  longitudPorEstribo: number; // m
  longitudTotalEstribos: number; // m
  pesoEstribos: number; // kg
  longitudTotalAceroPiel: number; // m
  pesoAceroPiel: number; // kg
  pesoAceroTotal: number; // kg
  longitudTotalFierro: number; // m
  warnings: string[];
}

const GANCHO_ESTRIBO_M = 0.2; // longitud adicional por ganchos a 135°, referencial

// Sugiere Lo (longitud de confinamiento) y S1 (separación) según NTE E.060.
// Art. 21.4.4 (edificios con muros estructurales): d/4, 8·db_long, 24·db_estribo, 30 cm.
// Art. 21.5.3 (edificios de pórticos o sistema dual, más exigente): d/4, 6·db_long, 15 cm.
// diametroLongitudinalMm debe ser el menor diámetro entre los grupos de barras confinados.
// Siempre editable: es un punto de partida, no reemplaza el diseño estructural.
export function sugerirConfinamiento(
  sistema: SistemaSismorresistente,
  alturaCm: number,
  recubrimientoCm: number,
  diametroLongitudinalMm: number,
  diametroEstriboMm: number
): { longitudConfinamientoCm: number; separacionConfinamientoCm: number } {
  const dCm = Math.max(alturaCm - recubrimientoCm, 0);
  const longitudConfinamientoCm = 2 * alturaCm;
  const s1Cm =
    sistema === "muros"
      ? Math.min(dCm / 4, (8 * diametroLongitudinalMm) / 10, (24 * diametroEstriboMm) / 10, 30)
      : Math.min(dCm / 4, (6 * diametroLongitudinalMm) / 10, 15);
  return {
    longitudConfinamientoCm: Math.round(longitudConfinamientoCm),
    separacionConfinamientoCm: Math.max(Math.floor(s1Cm), 5),
  };
}

// Posiciones (en metros, desde 0 hasta la longitud de la viga) de cada estribo en UNA
// viga. Usa exactamente los mismos conteos que calcularViga, para que el diagrama y el
// metrado nunca queden desincronizados.
export function estribosPositionsM(input: VigaInput): number[] {
  const separacionCentralM = input.separacionEstribos / 100;

  if (!input.incluirConfinamiento) {
    if (separacionCentralM <= 0) return [];
    const n = Math.floor(input.longitud / separacionCentralM) + 1;
    return Array.from({ length: n }, (_, i) => Math.min(i * separacionCentralM, input.longitud));
  }

  const loM = input.longitudConfinamiento / 100;
  const s1M = input.separacionConfinamiento / 100;
  const positions: number[] = [];

  if (s1M > 0) {
    const nConf = Math.floor(loM / s1M) + 1;
    for (let i = 0; i < nConf; i++) positions.push(Math.min(i * s1M, loM));
    for (let i = 0; i < nConf; i++) positions.push(Math.max(input.longitud - i * s1M, input.longitud - loM));
  }

  if (separacionCentralM > 0) {
    const longitudCentral = Math.max(input.longitud - 2 * loM, 0);
    const nCentral = Math.max(Math.floor(longitudCentral / separacionCentralM) - 1, 0);
    for (let i = 1; i <= nCentral; i++) positions.push(loM + i * separacionCentralM);
  }

  return positions.sort((a, b) => a - b);
}

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

  const grupos = input.barrasLongitudinales.length > 0 ? input.barrasLongitudinales : [];
  if (grupos.length === 0) {
    warnings.push("Debe indicar al menos un grupo de acero longitudinal.");
  }
  const numeroBarrasLongitudinales = grupos.reduce((acc, g) => acc + Math.max(g.cantidad, 0), 0);
  const longitudTotalBarrasLongitudinales = grupos.reduce(
    (acc, g) => acc + Math.max(g.cantidad, 0) * input.longitud * input.numeroVigas,
    0
  );
  const pesoAceroLongitudinal = grupos.reduce(
    (acc, g) => acc + Math.max(g.cantidad, 0) * input.longitud * input.numeroVigas * getRebar(g.diametroId).weightKgPerM,
    0
  );

  const rebarEstribo = getRebar(input.diametroEstribosId);
  const separacionCentralM = input.separacionEstribos / 100;

  let numeroEstribosConfinamientoPorExtremo = 0;
  let numeroEstribosCentralPorViga = 0;
  let numeroEstribosPorViga: number;

  if (input.incluirConfinamiento) {
    const loM = input.longitudConfinamiento / 100;
    const s1M = input.separacionConfinamiento / 100;

    if (2 * loM > input.longitud) {
      warnings.push(
        "La longitud de confinamiento en ambos extremos (2×Lo) supera la longitud de la viga; revisa Lo."
      );
    }

    numeroEstribosConfinamientoPorExtremo = s1M > 0 ? Math.floor(loM / s1M) + 1 : 0;
    const longitudCentral = Math.max(input.longitud - 2 * loM, 0);
    numeroEstribosCentralPorViga =
      separacionCentralM > 0 ? Math.max(Math.floor(longitudCentral / separacionCentralM) - 1, 0) : 0;
    numeroEstribosPorViga = 2 * numeroEstribosConfinamientoPorExtremo + numeroEstribosCentralPorViga;
  } else {
    numeroEstribosPorViga = separacionCentralM > 0 ? Math.floor(input.longitud / separacionCentralM) + 1 : 0;
  }

  const numeroEstribosTotal = numeroEstribosPorViga * input.numeroVigas;
  const longitudPorEstribo = 2 * (baseM - 2 * recubM) + 2 * (alturaM - 2 * recubM) + GANCHO_ESTRIBO_M;
  const longitudTotalEstribos = longitudPorEstribo * numeroEstribosTotal;
  const pesoEstribos = longitudTotalEstribos * rebarEstribo.weightKgPerM;

  const longitudTotalAceroPiel = input.incluirAceroPiel
    ? Math.max(input.pielNumeroBarras, 0) * input.longitud * input.numeroVigas
    : 0;
  const pesoAceroPiel = longitudTotalAceroPiel * getRebar(input.pielDiametroId).weightKgPerM;

  const pesoAceroTotal = pesoAceroLongitudinal + pesoEstribos + pesoAceroPiel;
  const longitudTotalFierro = longitudTotalBarrasLongitudinales + longitudTotalEstribos + longitudTotalAceroPiel;

  if (input.recubrimiento * 2 >= Math.min(input.base, input.altura)) {
    warnings.push("El recubrimiento indicado es demasiado grande respecto a la sección de la viga.");
  }

  return {
    areaSeccion,
    volumenConcreto,
    perimetroEncofrado,
    areaEncofrado,
    numeroBarrasLongitudinales,
    longitudTotalBarrasLongitudinales,
    pesoAceroLongitudinal,
    numeroEstribosConfinamientoPorExtremo,
    numeroEstribosCentralPorViga,
    numeroEstribosPorViga,
    numeroEstribosTotal,
    longitudPorEstribo,
    longitudTotalEstribos,
    pesoEstribos,
    longitudTotalAceroPiel,
    pesoAceroPiel,
    pesoAceroTotal,
    longitudTotalFierro,
    warnings,
  };
}
