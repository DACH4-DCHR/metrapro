import { getRebar, type RebarSize } from "../materials";
import type { BarraGrupo } from "./viga";
import type { AceroItem } from "./aceroResumen";
import { longitudGanchoBarra90, longitudGanchoEstribo135 } from "./ganchos";

export type { BarraGrupo };

export interface VigaCimentacionInput {
  numeroVigas: number;
  luzLibre: number; // m, espacio libre entre columnas o cabezales conectados
  base: number; // cm
  altura: number; // cm
  barrasInferiores: BarraGrupo[];
  barrasSuperiores: BarraGrupo[];
  barrasLaterales: BarraGrupo[]; // acero de piel, caras laterales del alma
  diametroEstribosId: string;
  separacionEstribos: number; // cm, estribos cerrados uniformes en toda la longitud
  recubrimiento: number; // cm

  considerarGanchoEstribo: boolean;
  considerarGanchoLongitudinal: boolean;
  extremosConGancho: number; // 0, 1 ó 2 extremos por barra longitudinal, si se considera

  // Cuando la viga de cimentación llega al mismo nivel que el fondo de una zapata, el
  // concreto solo se metra hasta el encuentro entre ambos (luzLibre), pero el acero
  // longitudinal normalmente continúa recto dentro de la zapata hasta anclar en la
  // columna. Esta prolongación es solo de acero, no de concreto.
  considerarProlongacionZapata: boolean;
  longitudProlongacionZapata: number; // m, por extremo que ingresa a una zapata
  extremosConProlongacion: number; // 0, 1 ó 2 extremos por barra longitudinal, si se considera
}

export interface VigaCimentacionResult {
  areaSeccion: number; // m2
  volumenConcreto: number; // m3
  areaEncofrado: number; // m2 (caras laterales, fondo apoyado en solado/terreno)
  numeroBarrasInferiores: number;
  numeroBarrasSuperiores: number;
  numeroBarrasLaterales: number;
  numeroBarrasLongitudinales: number;
  longitudTotalBarrasLongitudinales: number; // m
  pesoAceroLongitudinal: number; // kg
  numeroEstribosPorViga: number;
  numeroEstribosTotal: number;
  longitudPorEstribo: number; // m
  longitudTotalEstribos: number; // m
  pesoEstribos: number; // kg
  pesoAceroTotal: number; // kg
  longitudTotalFierro: number; // m
  dimensionMinimaSugeridaCm: number; // E.060 Art. 21.12.3.2: luz libre/20, máx. 45 cm
  separacionMaximaSugeridaCm: number; // E.060 Art. 21.12.3.2: mín(menor dimensión, 30 cm, 16·db)
  desgloseAcero: AceroItem[];
  warnings: string[];
}

function minDiametroMm(grupos: BarraGrupo[]): number {
  const dbs = grupos.filter((g) => g.cantidad > 0).map((g) => getRebar(g.diametroId).diameterMm);
  return dbs.length > 0 ? Math.min(...dbs) : 16;
}

// Separación máxima de estribos cerrados según E.060 Art. 21.12.3.2: no debe exceder
// la menor de: la menor dimensión de la sección transversal, 300 mm, ó 16·db (barra
// longitudinal de menor diámetro que se confina).
export function sugerirSeparacionEstribosCimentacion(
  base: number,
  altura: number,
  barrasLongitudinales: BarraGrupo[]
): number {
  const dbCm = minDiametroMm(barrasLongitudinales) / 10;
  return Math.max(Math.floor(Math.min(Math.min(base, altura), 30, 16 * dbCm)), 5);
}

export function calcularVigaCimentacion(input: VigaCimentacionInput): VigaCimentacionResult {
  const warnings: string[] = [];
  const baseM = input.base / 100;
  const alturaM = input.altura / 100;
  const recubM = input.recubrimiento / 100;

  const areaSeccion = baseM * alturaM;
  const volumenConcreto = areaSeccion * input.luzLibre * input.numeroVigas;
  const areaEncofrado = 2 * alturaM * input.luzLibre * input.numeroVigas;

  const grupos = [...input.barrasInferiores, ...input.barrasSuperiores, ...input.barrasLaterales];
  if (grupos.length === 0 || grupos.every((g) => g.cantidad <= 0)) {
    warnings.push("Debe indicar al menos un grupo de acero longitudinal.");
  }
  const numeroBarrasInferiores = input.barrasInferiores.reduce((acc, g) => acc + Math.max(g.cantidad, 0), 0);
  const numeroBarrasSuperiores = input.barrasSuperiores.reduce((acc, g) => acc + Math.max(g.cantidad, 0), 0);
  const numeroBarrasLaterales = input.barrasLaterales.reduce((acc, g) => acc + Math.max(g.cantidad, 0), 0);
  const numeroBarrasLongitudinales = numeroBarrasInferiores + numeroBarrasSuperiores + numeroBarrasLaterales;
  const extremosConGancho = input.considerarGanchoLongitudinal ? Math.max(Math.min(input.extremosConGancho, 2), 0) : 0;
  const extremosConProlongacion = input.considerarProlongacionZapata
    ? Math.max(Math.min(input.extremosConProlongacion, 2), 0)
    : 0;
  function longitudBarraLongitudinal(diametroId: string): number {
    return (
      input.luzLibre +
      extremosConGancho * longitudGanchoBarra90(diametroId) +
      extremosConProlongacion * input.longitudProlongacionZapata
    );
  }
  const longitudTotalBarrasLongitudinales = grupos.reduce(
    (acc, g) => acc + Math.max(g.cantidad, 0) * longitudBarraLongitudinal(g.diametroId) * input.numeroVigas,
    0
  );
  const pesoAceroLongitudinal = grupos.reduce(
    (acc, g) =>
      acc +
      Math.max(g.cantidad, 0) * longitudBarraLongitudinal(g.diametroId) * input.numeroVigas * getRebar(g.diametroId).weightKgPerM,
    0
  );

  const rebarEstribo: RebarSize = getRebar(input.diametroEstribosId);
  const separacionM = input.separacionEstribos / 100;
  const numeroEstribosPorViga = separacionM > 0 ? Math.floor(input.luzLibre / separacionM) + 1 : 0;
  const numeroEstribosTotal = numeroEstribosPorViga * input.numeroVigas;
  const longitudGanchoEstribo = input.considerarGanchoEstribo ? longitudGanchoEstribo135(input.diametroEstribosId) : 0;
  const longitudPorEstribo = 2 * (input.base / 100 - 2 * recubM) + 2 * (input.altura / 100 - 2 * recubM) + longitudGanchoEstribo;
  const longitudTotalEstribos = longitudPorEstribo * numeroEstribosTotal;
  const pesoEstribos = longitudTotalEstribos * rebarEstribo.weightKgPerM;

  const pesoAceroTotal = pesoAceroLongitudinal + pesoEstribos;
  const longitudTotalFierro = longitudTotalBarrasLongitudinales + longitudTotalEstribos;

  const dimensionMinimaSugeridaCm = Math.min((input.luzLibre * 100) / 20, 45);
  const separacionMaximaSugeridaCm = sugerirSeparacionEstribosCimentacion(input.base, input.altura, grupos);

  if (Math.min(input.base, input.altura) < dimensionMinimaSugeridaCm) {
    warnings.push(
      `La menor dimensión de la sección (${Math.min(input.base, input.altura)} cm) es menor al mínimo sugerido de ${dimensionMinimaSugeridaCm.toFixed(
        1
      )} cm (luz libre/20, E.060 Art. 21.12.3.2).`
    );
  }
  if (input.separacionEstribos > separacionMaximaSugeridaCm) {
    warnings.push(
      `La separación de estribos supera el máximo permitido de ${separacionMaximaSugeridaCm} cm (mín. entre menor dimensión, 30 cm y 16·db, E.060 Art. 21.12.3.2).`
    );
  }
  if (input.recubrimiento * 2 >= Math.min(input.base, input.altura)) {
    warnings.push("El recubrimiento indicado es demasiado grande respecto a la sección de la viga.");
  }
  if (input.considerarProlongacionZapata && input.longitudProlongacionZapata <= 0) {
    warnings.push("Indica la longitud de prolongación del acero dentro de la zapata (distancia hasta la columna).");
  }

  const desgloseAcero: AceroItem[] = [
    ...grupos.map((g) => ({
      diametroId: g.diametroId,
      longitudM: Math.max(g.cantidad, 0) * longitudBarraLongitudinal(g.diametroId) * input.numeroVigas,
    })),
    { diametroId: input.diametroEstribosId, longitudM: longitudTotalEstribos },
  ];

  return {
    areaSeccion,
    volumenConcreto,
    areaEncofrado,
    numeroBarrasInferiores,
    numeroBarrasSuperiores,
    numeroBarrasLaterales,
    numeroBarrasLongitudinales,
    longitudTotalBarrasLongitudinales,
    pesoAceroLongitudinal,
    numeroEstribosPorViga,
    numeroEstribosTotal,
    longitudPorEstribo,
    longitudTotalEstribos,
    pesoEstribos,
    pesoAceroTotal,
    longitudTotalFierro,
    dimensionMinimaSugeridaCm,
    separacionMaximaSugeridaCm,
    desgloseAcero,
    warnings,
  };
}
