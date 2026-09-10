import { getRebar } from "../materials";
import type { BarraGrupo } from "./viga";
import type { AceroItem } from "./aceroResumen";
import { longitudGanchoBarra90, longitudGanchoEstribo135 } from "./ganchos";

export type { BarraGrupo };
export type TipoSeccionColumna = "rectangular" | "circular";
export type SistemaSismorresistenteColumna = "muros" | "porticos_dual";
export type CaraColumna = "peralte" | "base";

// Refuerzo transversal suplementario, adicional al estribo perimetral, en columnas donde
// éste solo no alcanza a confinar todas las barras longitudinales (E.060 Art. 21.6.4.3 /
// 21.4.5.4). Dos tipos, según el detalle real de obra:
// - "grapa": una rama recta con gancho a 90° en un extremo y a 135° en el otro (ACI 318
//   25.3.4), que cruza entre dos barras intermedias opuestas — necesita "cara" para saber
//   qué par de caras (y por lo tanto qué barra) conecta.
// - "cerrado": un estribo cerrado adicional, con el mismo perímetro que el estribo
//   principal (gancho a 135° en ambos extremos) — "cara" no aplica, ya que rodea toda la
//   sección igual que el estribo principal.
// Ocurre al mismo nivel y con la misma cantidad que el estribo perimetral.
export type TipoEstriboSuplementario = "grapa" | "cerrado";

export interface EstriboSuplementario {
  diametroId: string;
  numeroRamas: number; // grapa: N° de ramas; cerrado: N° de estribos cerrados adicionales
  cara: CaraColumna; // solo aplica si tipo === "grapa"
  tipo: TipoEstriboSuplementario;
}

export interface ColumnaInput {
  numeroColumnas: number;
  alturaLibre: number; // m, altura libre de entrepiso (luz libre de la columna)
  tipoSeccion: TipoSeccionColumna;
  base: number; // cm (rectangular)
  peralte: number; // cm (rectangular)
  diametro: number; // cm (circular)

  // Columnas rectangulares: 3 roles explícitos, igual que en un plano de detalle real.
  diametroEsquinaId: string; // barra de esquina — siempre 4, una por esquina
  barrasCarasPeralteGrupos: BarraGrupo[]; // adicionales; "cantidad" es POR CADA cara de peralte (hay 2)
  barrasCarasBaseGrupos: BarraGrupo[]; // adicionales; "cantidad" es POR CADA cara de base (hay 2)

  // Columnas circulares: distribución uniforme en el perímetro (no aplican esquinas/caras).
  barrasLongitudinalesCirculares: BarraGrupo[];

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

// Menor diámetro longitudinal presente, usado para sugerir el confinamiento (So).
// Considera esquina + caras (rectangular) o el listado circular, según corresponda.
export function minDiametroLongitudinalMm(input: ColumnaInput): number {
  if (input.tipoSeccion === "circular") {
    return minDiametroMm(input.barrasLongitudinalesCirculares);
  }
  return minDiametroMm([
    { diametroId: input.diametroEsquinaId, cantidad: 4 },
    ...input.barrasCarasPeralteGrupos,
    ...input.barrasCarasBaseGrupos,
  ]);
}

export interface BarraLongitudinalPosicionada {
  x: number; // cm, coordenada local [0,base] (rectangular) o [0,diametro] (circular)
  z: number; // cm, coordenada local [0,peralte] (rectangular) o [0,diametro] (circular)
  diametroId: string;
}

// Posiciones reales (en cm, coordenadas locales sin proyectar) de cada barra longitudinal,
// usadas tanto por la sección transversal 2D como por la vista isométrica 3D — así ambas
// vistas y el metrado están siempre de acuerdo. Rectangular: 4 esquinas fijas + barras
// repartidas simétricamente a lo largo de las caras de peralte y de base (excluyendo las
// esquinas, que ya están ocupadas). Circular: distribución uniforme en el perímetro.
export function posicionesBarrasLongitudinales(input: ColumnaInput): BarraLongitudinalPosicionada[] {
  if (input.tipoSeccion === "circular") {
    const r = input.diametro / 2;
    const diametros: string[] = [];
    for (const g of input.barrasLongitudinalesCirculares) {
      for (let k = 0; k < Math.max(Math.floor(g.cantidad), 0); k++) diametros.push(g.diametroId);
    }
    const n = diametros.length;
    return diametros.map((diametroId, idx) => {
      const angle = (2 * Math.PI * idx) / n - Math.PI / 2;
      return { x: r + r * Math.cos(angle), z: r + r * Math.sin(angle), diametroId };
    });
  }

  const w = input.base;
  const d = input.peralte;
  const posiciones: BarraLongitudinalPosicionada[] = [
    { x: 0, z: 0, diametroId: input.diametroEsquinaId },
    { x: w, z: 0, diametroId: input.diametroEsquinaId },
    { x: w, z: d, diametroId: input.diametroEsquinaId },
    { x: 0, z: d, diametroId: input.diametroEsquinaId },
  ];

  for (const { t, diametroId } of posicionesIntermediasCara(input, "peralte")) {
    posiciones.push({ x: 0, z: t * d, diametroId });
    posiciones.push({ x: w, z: t * d, diametroId });
  }
  for (const { t, diametroId } of posicionesIntermediasCara(input, "base")) {
    posiciones.push({ x: t * w, z: 0, diametroId });
    posiciones.push({ x: t * w, z: d, diametroId });
  }

  return posiciones;
}

// Posiciones intermedias (fracción 0..1 a lo largo de la cara, entre una esquina y la
// otra) de las barras adicionales en una cara de peralte o de base, en el orden de los
// grupos declarados. Se usa para dibujar las barras y para alinear los estribos
// suplementarios con la barra real a la que arriostran.
export function posicionesIntermediasCara(
  input: ColumnaInput,
  cara: CaraColumna
): { t: number; diametroId: string }[] {
  const grupos = cara === "peralte" ? input.barrasCarasPeralteGrupos : input.barrasCarasBaseGrupos;
  const diametros: string[] = [];
  for (const g of grupos) {
    for (let k = 0; k < Math.max(Math.floor(g.cantidad), 0); k++) diametros.push(g.diametroId);
  }
  const total = diametros.length;
  return diametros.map((diametroId, j) => ({ t: (j + 1) / (total + 1), diametroId }));
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

  // Grupos "efectivos" de barras longitudinales, ya con la cantidad TOTAL de cada uno
  // (esquina ×4, caras ×2 caras cada uno) — de aquí salen cuantía, peso y desglose.
  const isRect = input.tipoSeccion === "rectangular";
  const gruposEfectivos: BarraGrupo[] = isRect
    ? [
        { diametroId: input.diametroEsquinaId, cantidad: 4 },
        ...input.barrasCarasPeralteGrupos.map((g) => ({ diametroId: g.diametroId, cantidad: 2 * Math.max(g.cantidad, 0) })),
        ...input.barrasCarasBaseGrupos.map((g) => ({ diametroId: g.diametroId, cantidad: 2 * Math.max(g.cantidad, 0) })),
      ]
    : input.barrasLongitudinalesCirculares;

  if (!isRect && (gruposEfectivos.length === 0 || gruposEfectivos.every((g) => g.cantidad <= 0))) {
    warnings.push("Debe indicar al menos un grupo de acero longitudinal.");
  }
  const numeroBarrasLongitudinales = gruposEfectivos.reduce((acc, g) => acc + Math.max(g.cantidad, 0), 0);
  const areaAceroLongitudinalCm2 = gruposEfectivos.reduce((acc, g) => {
    const db = getRebar(g.diametroId).diameterMm / 10; // cm
    return acc + Math.max(g.cantidad, 0) * ((Math.PI * db * db) / 4);
  }, 0);
  const pesoAceroLongitudinal = gruposEfectivos.reduce(
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
  // sección entre las 2 caras que indica cada grupo (peralte o base), al mismo nivel y
  // cantidad que el estribo perimetral.
  const suplementarios = isRect ? input.estribosSuplementarios : [];
  const gruposSuplementarios = suplementarios.map((s) => {
    if (s.tipo === "cerrado") {
      // Estribo cerrado adicional: mismo perímetro que el principal, gancho a 135° en
      // ambos extremos (igual convención que longitudPorEstribo, arriba).
      const longitudGancho = input.considerarGanchoEstribo ? longitudGanchoEstribo135(s.diametroId) : 0;
      const longitudPorEstriboSuplementario = longitudPorEstriboBase + longitudGancho;
      const longitudTotal = longitudPorEstriboSuplementario * Math.max(s.numeroRamas, 0) * numeroEstribosTotal;
      return { diametroId: s.diametroId, longitudTotal, peso: longitudTotal * getRebar(s.diametroId).weightKgPerM };
    }
    // Grapa: una rama recta con gancho a 90° en un extremo y a 135° en el otro.
    const dimM = (s.cara === "peralte" ? input.base : input.peralte) / 100 - 2 * recubM;
    const dbM = getRebar(s.diametroId).diameterMm / 1000;
    const longitudGancho = input.considerarGanchoEstribo
      ? longitudGanchoBarra90(s.diametroId) + Math.max(6 * dbM, 0.075)
      : 0;
    const longitudPorRama = Math.max(dimM, 0) + longitudGancho;
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
    ...gruposEfectivos.map((g) => ({
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
