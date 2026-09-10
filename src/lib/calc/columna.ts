import { getRebar } from "../materials";
import type { BarraGrupo } from "./viga";
import type { AceroItem } from "./aceroResumen";
import { longitudGanchoBarra90, longitudGanchoEstribo135 } from "./ganchos";

export type { BarraGrupo };
export type TipoSeccionColumna = "rectangular" | "circular";
export type SistemaSismorresistenteColumna = "muros" | "porticos_dual";

// Estribo suplementario ("grapa"/"gancho suplementario"): rama adicional recta que cruza
// la sección para arriostrar barras longitudinales intermedias, en columnas donde el
// estribo perimetral por sí solo no alcanza a confinar todas las barras (E.060 Art.
// 21.6.4.3 / 21.4.5.4). Ocurre en el mismo nivel y con la misma cantidad que el estribo
// perimetral, pero puede tener su propio diámetro. Solo aplica a columnas rectangulares.
export interface EstriboSuplementario {
  diametroId: string;
  numeroRamas: number; // ramas adicionales por cada nivel de estribo
}

export interface ColumnaInput {
  numeroColumnas: number;
  alturaLibre: number; // m, altura libre de entrepiso (luz libre de la columna)
  tipoSeccion: TipoSeccionColumna;
  base: number; // cm (rectangular)
  peralte: number; // cm (rectangular)
  diametro: number; // cm (circular)

  barrasLongitudinales: BarraGrupo[];
  diametroEstribosId: string;
  estribosSuplementarios: EstriboSuplementario[]; // hasta 2 grupos adicionales
  recubrimiento: number; // cm

  sistemaSismorresistente: SistemaSismorresistenteColumna;
  incluirConfinamiento: boolean;
  longitudConfinamiento: number; // cm (Lo), por extremo
  separacionConfinamiento: number; // cm (So), dentro de Lo
  separacionCentral: number; // cm, fuera de Lo (o única si no hay confinamiento)

  considerarGanchoEstribo: boolean;
}

export interface ColumnaResult {
  areaSeccion: number; // m2
  volumenConcreto: number; // m3
  perimetroSeccion: number; // m
  areaEncofrado: number; // m2
  numeroBarrasLongitudinales: number;
  pesoAceroLongitudinal: number; // kg
  cuantiaPct: number; // %
  numeroEstribosConfinamientoPorExtremo: number;
  numeroEstribosCentralPorColumna: number;
  numeroEstribosPorColumna: number;
  numeroEstribosTotal: number;
  longitudPorEstribo: number; // m
  pesoEstribos: number; // kg
  pesoEstribosSuplementarios: number; // kg
  pesoAceroTotal: number; // kg
  longitudTotalFierro: number; // m
  desgloseAcero: AceroItem[];
  warnings: string[];
}

// Sugiere Lo, So (dentro de Lo) y separación fuera de Lo para columnas, según:
// Art. 21.4.5 (edificios con muros estructurales): Lo=máx(mayor dim, luz libre/6, 50cm);
//   So=mín(8·db, menor dim/2, 10cm); fuera de Lo=mín(12·db, menor dim, 30cm).
// Art. 21.6.4 (edificios de pórticos o sistema dual, más exigente): Lo=máx(mayor dim, luz
//   libre/6, 50cm); So=mín(6·db, 10cm); fuera de Lo=mín(10·db, menor dim, 25cm).
export function sugerirConfinamientoColumna(
  sistema: SistemaSismorresistenteColumna,
  mayorDimensionCm: number,
  menorDimensionCm: number,
  alturaLibreM: number,
  diametroLongitudinalMm: number
): { longitudConfinamientoCm: number; separacionConfinamientoCm: number; separacionCentralCm: number } {
  const dbCm = diametroLongitudinalMm / 10;
  const loCm = Math.max(mayorDimensionCm, (alturaLibreM * 100) / 6, 50);

  const soCm =
    sistema === "muros" ? Math.min(8 * dbCm, menorDimensionCm / 2, 10) : Math.min(6 * dbCm, 10);
  const sCentralCm =
    sistema === "muros" ? Math.min(12 * dbCm, menorDimensionCm, 30) : Math.min(10 * dbCm, menorDimensionCm, 25);

  return {
    longitudConfinamientoCm: Math.round(loCm),
    separacionConfinamientoCm: Math.max(Math.floor(soCm), 5),
    separacionCentralCm: Math.max(Math.floor(sCentralCm), 5),
  };
}

function minDiametroMm(grupos: BarraGrupo[]): number {
  const dbs = grupos.filter((g) => g.cantidad > 0).map((g) => getRebar(g.diametroId).diameterMm);
  return dbs.length > 0 ? Math.min(...dbs) : 16;
}

// Posiciones (en metros, desde 0 hasta la altura libre) de cada estribo en UNA columna.
// Usa exactamente los mismos conteos que calcularColumna, para que cualquier vista (2D o
// 3D) que dibuje estribos a partir de esto nunca quede desincronizada con el metrado.
export function estribosPositionsColumnaM(input: ColumnaInput): number[] {
  const separacionCentralM = input.separacionCentral / 100;

  if (!input.incluirConfinamiento) {
    if (separacionCentralM <= 0) return [];
    const n = Math.floor(input.alturaLibre / separacionCentralM) + 1;
    return Array.from({ length: n }, (_, i) => Math.min(i * separacionCentralM, input.alturaLibre));
  }

  const loM = input.longitudConfinamiento / 100;
  const soM = input.separacionConfinamiento / 100;
  const positions: number[] = [];

  if (soM > 0) {
    const nConf = Math.floor(loM / soM) + 1;
    for (let i = 0; i < nConf; i++) positions.push(Math.min(i * soM, loM));
    for (let i = 0; i < nConf; i++) positions.push(Math.max(input.alturaLibre - i * soM, input.alturaLibre - loM));
  }

  if (separacionCentralM > 0) {
    const alturaCentral = Math.max(input.alturaLibre - 2 * loM, 0);
    const nCentral = Math.max(Math.floor(alturaCentral / separacionCentralM) - 1, 0);
    for (let i = 1; i <= nCentral; i++) positions.push(loM + i * separacionCentralM);
  }

  return positions.sort((a, b) => a - b);
}

export function calcularColumna(input: ColumnaInput): ColumnaResult {
  const warnings: string[] = [];
  const recubM = input.recubrimiento / 100;

  let areaSeccion: number;
  let perimetroSeccion: number;
  let menorDimensionCm: number;
  let longitudPorEstriboBase: number;

  if (input.tipoSeccion === "rectangular") {
    const baseM = input.base / 100;
    const peralteM = input.peralte / 100;
    areaSeccion = baseM * peralteM;
    perimetroSeccion = 2 * (baseM + peralteM);
    menorDimensionCm = Math.min(input.base, input.peralte);
    longitudPorEstriboBase = 2 * (baseM - 2 * recubM) + 2 * (peralteM - 2 * recubM);
  } else {
    const diametroM = input.diametro / 100;
    areaSeccion = (Math.PI * diametroM * diametroM) / 4;
    perimetroSeccion = Math.PI * diametroM;
    menorDimensionCm = input.diametro;
    longitudPorEstriboBase = Math.PI * (diametroM - 2 * recubM);
  }

  const volumenConcreto = areaSeccion * input.alturaLibre * input.numeroColumnas;
  const areaEncofrado = perimetroSeccion * input.alturaLibre * input.numeroColumnas;

  const grupos = input.barrasLongitudinales;
  if (grupos.length === 0 || grupos.every((g) => g.cantidad <= 0)) {
    warnings.push("Debe indicar al menos un grupo de acero longitudinal.");
  }
  const numeroBarrasLongitudinales = grupos.reduce((acc, g) => acc + Math.max(g.cantidad, 0), 0);
  const areaAceroLongitudinalCm2 = grupos.reduce((acc, g) => {
    const db = getRebar(g.diametroId).diameterMm / 10; // cm
    return acc + Math.max(g.cantidad, 0) * ((Math.PI * db * db) / 4);
  }, 0);
  const pesoAceroLongitudinal = grupos.reduce(
    (acc, g) =>
      acc + Math.max(g.cantidad, 0) * input.alturaLibre * input.numeroColumnas * getRebar(g.diametroId).weightKgPerM,
    0
  );

  const areaSeccionCm2 = areaSeccion * 10000;
  const cuantiaPct = areaSeccionCm2 > 0 ? (areaAceroLongitudinalCm2 / areaSeccionCm2) * 100 : 0;

  if (cuantiaPct < 1) {
    warnings.push(
      `La cuantía de acero longitudinal (${cuantiaPct.toFixed(2)}%) es menor al mínimo de 1% exigido por E.060 Art. 21.6.3.1 / 21.4.5.2 para columnas sismorresistentes.`
    );
  } else if (cuantiaPct > 6) {
    warnings.push(
      `La cuantía de acero longitudinal (${cuantiaPct.toFixed(2)}%) supera el máximo de 6% permitido por E.060 Art. 21.6.3.1 / 21.4.5.2.`
    );
  } else if (cuantiaPct > 4) {
    warnings.push(
      `La cuantía de acero longitudinal (${cuantiaPct.toFixed(2)}%) supera 4%; los planos deben incluir detalles constructivos de la armadura en la unión viga-columna (E.060 Art. 21.6.3.1).`
    );
  }

  if (input.sistemaSismorresistente === "porticos_dual" && menorDimensionCm < 25) {
    warnings.push(
      "La menor dimensión de la sección es menor a 25 cm, el mínimo para columnas de edificios con sistema de pórticos o dual (E.060 Art. 21.6.1.2)."
    );
  }

  const rebarEstribo = getRebar(input.diametroEstribosId);
  const separacionCentralM = input.separacionCentral / 100;

  let numeroEstribosConfinamientoPorExtremo = 0;
  let numeroEstribosCentralPorColumna = 0;
  let numeroEstribosPorColumna: number;

  if (input.incluirConfinamiento) {
    const loM = input.longitudConfinamiento / 100;
    const soM = input.separacionConfinamiento / 100;

    if (2 * loM > input.alturaLibre) {
      warnings.push("La longitud de confinamiento en ambos extremos (2×Lo) supera la altura libre de la columna; revisa Lo.");
    }

    numeroEstribosConfinamientoPorExtremo = soM > 0 ? Math.floor(loM / soM) + 1 : 0;
    const alturaCentral = Math.max(input.alturaLibre - 2 * loM, 0);
    numeroEstribosCentralPorColumna =
      separacionCentralM > 0 ? Math.max(Math.floor(alturaCentral / separacionCentralM) - 1, 0) : 0;
    numeroEstribosPorColumna = 2 * numeroEstribosConfinamientoPorExtremo + numeroEstribosCentralPorColumna;
  } else {
    numeroEstribosPorColumna = separacionCentralM > 0 ? Math.floor(input.alturaLibre / separacionCentralM) + 1 : 0;
  }

  const numeroEstribosTotal = numeroEstribosPorColumna * input.numeroColumnas;
  const longitudGanchoEstribo = input.considerarGanchoEstribo ? longitudGanchoEstribo135(input.diametroEstribosId) : 0;
  const longitudPorEstribo = longitudPorEstriboBase + longitudGanchoEstribo;
  const longitudTotalEstribos = longitudPorEstribo * numeroEstribosTotal;
  const pesoEstribos = longitudTotalEstribos * rebarEstribo.weightKgPerM;

  // Estribos suplementarios: solo en columnas rectangulares, una rama recta que cruza la
  // menor dimensión de la sección, al mismo nivel y cantidad que el estribo perimetral.
  const suplementarios = input.tipoSeccion === "rectangular" ? input.estribosSuplementarios : [];
  const gruposSuplementarios = suplementarios.map((s) => {
    const menorDimM = Math.min(input.base, input.peralte) / 100 - 2 * recubM;
    const longitudGancho = input.considerarGanchoEstribo ? 2 * longitudGanchoBarra90(s.diametroId) : 0;
    const longitudPorRama = Math.max(menorDimM, 0) + longitudGancho;
    const longitudTotal = longitudPorRama * Math.max(s.numeroRamas, 0) * numeroEstribosTotal;
    return { diametroId: s.diametroId, longitudTotal, peso: longitudTotal * getRebar(s.diametroId).weightKgPerM };
  });
  const pesoEstribosSuplementarios = gruposSuplementarios.reduce((acc, g) => acc + g.peso, 0);
  const longitudTotalSuplementarios = gruposSuplementarios.reduce((acc, g) => acc + g.longitudTotal, 0);

  const pesoAceroTotal = pesoAceroLongitudinal + pesoEstribos + pesoEstribosSuplementarios;
  const longitudTotalFierro =
    numeroBarrasLongitudinales * input.alturaLibre * input.numeroColumnas +
    longitudTotalEstribos +
    longitudTotalSuplementarios;

  if (input.recubrimiento * 2 >= menorDimensionCm) {
    warnings.push("El recubrimiento indicado es demasiado grande respecto a la sección de la columna.");
  }

  const desgloseAcero: AceroItem[] = [
    ...grupos.map((g) => ({
      diametroId: g.diametroId,
      longitudM: Math.max(g.cantidad, 0) * input.alturaLibre * input.numeroColumnas,
    })),
    { diametroId: input.diametroEstribosId, longitudM: longitudTotalEstribos },
    ...gruposSuplementarios
      .filter((g) => g.longitudTotal > 0)
      .map((g) => ({ diametroId: g.diametroId, longitudM: g.longitudTotal })),
  ];

  return {
    areaSeccion,
    volumenConcreto,
    perimetroSeccion,
    areaEncofrado,
    numeroBarrasLongitudinales,
    pesoAceroLongitudinal,
    cuantiaPct,
    numeroEstribosConfinamientoPorExtremo,
    numeroEstribosCentralPorColumna,
    numeroEstribosPorColumna,
    numeroEstribosTotal,
    longitudPorEstribo,
    pesoEstribos,
    pesoEstribosSuplementarios,
    pesoAceroTotal,
    longitudTotalFierro,
    desgloseAcero,
    warnings,
  };
}

export { minDiametroMm as minDiametroLongitudinalMm };
