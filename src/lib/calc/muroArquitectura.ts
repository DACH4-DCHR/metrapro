import { getRebar } from "../materials";
import type { BarraGrupo } from "./viga";
import type { AceroItem } from "./aceroResumen";
import { longitudGanchoEstribo135 } from "./ganchos";

export type { BarraGrupo };

export interface MuroArquitecturaInput {
  longitud: number; // m
  alturaLibre: number; // m
  espesor: number; // cm, espesor efectivo del tabique
  areaVanos: number; // m2, puertas/ventanas a descontar

  ladrilloId: string; // id del catálogo (ladrillos.ts) o "personalizado"
  largoUnidad: number; // cm
  alturaUnidad: number; // cm
  juntaMortero: number; // cm
  desperdicioPct: number; // %

  incluirArriostres: boolean;
  numeroColumnetas: number;
  peralteColumneta: number; // cm
  barrasColumneta: BarraGrupo[];
  diametroEstribosColumnetaId: string;
  separacionEstribosColumneta: number; // cm
  recubrimiento: number; // cm

  considerarGanchoEstribo: boolean;
}

export interface MuroArquitecturaResult {
  areaMuroBruta: number; // m2
  areaMuroNeta: number; // m2, descontando vanos
  numeroUnidades: number;
  unidadesPorM2: number; // rendimiento (sin desperdicio), unidades por m2 de muro
  volumenMortero: number; // m3
  volumenConcretoColumnetas: number; // m3
  encofradoColumnetas: number; // m2
  pesoAceroColumnetas: number; // kg
  pesoEstribosColumnetas: number; // kg
  pesoAceroTotal: number; // kg
  longitudTotalFierro: number; // m
  espaciamientoMaximoArriostresM: number; // mín(2h, 5m), E.070 Art. 67
  desgloseAcero: AceroItem[];
  warnings: string[];
}

export function calcularMuroArquitectura(input: MuroArquitecturaInput): MuroArquitecturaResult {
  const warnings: string[] = [];
  const espesorM = input.espesor / 100;
  const recubM = input.recubrimiento / 100;

  const areaMuroBruta = input.longitud * input.alturaLibre;
  const areaMuroNeta = Math.max(areaMuroBruta - Math.max(input.areaVanos, 0), 0);

  const largoUnidadM = input.largoUnidad / 100;
  const alturaUnidadM = input.alturaUnidad / 100;
  const juntaM = input.juntaMortero / 100;
  const areaUnidadEfectiva = (largoUnidadM + juntaM) * (alturaUnidadM + juntaM);
  const numeroUnidadesNeto = areaUnidadEfectiva > 0 ? areaMuroNeta / areaUnidadEfectiva : 0;
  const numeroUnidades = Math.ceil(numeroUnidadesNeto * (1 + input.desperdicioPct / 100));
  const unidadesPorM2 = areaUnidadEfectiva > 0 ? 1 / areaUnidadEfectiva : 0;

  const volumenMuroNeto = areaMuroNeta * espesorM;
  const volumenUnidades = numeroUnidadesNeto * largoUnidadM * alturaUnidadM * espesorM;
  const volumenMortero = Math.max(volumenMuroNeto - volumenUnidades, 0);

  const espaciamientoMaximoArriostresM = Math.min(2 * input.alturaLibre, 5);

  let volumenConcretoColumnetas = 0;
  let encofradoColumnetas = 0;
  let pesoAceroColumnetas = 0;
  let pesoEstribosColumnetas = 0;
  let longitudBarras = 0;
  let longitudEstribos = 0;
  let desgloseAcero: AceroItem[] = [];

  if (input.incluirArriostres) {
    const peralteM = input.peralteColumneta / 100;

    if (input.numeroColumnetas < 2) {
      warnings.push("Se recomienda arriostrar ambos extremos del paño con al menos 2 columnetas (E.070 Art. 71).");
    }

    const espaciamientoActual =
      input.numeroColumnetas > 1 ? input.longitud / (input.numeroColumnetas - 1) : input.longitud;
    if (espaciamientoActual > espaciamientoMaximoArriostresM) {
      warnings.push(
        `El espaciamiento entre arriostres (${espaciamientoActual.toFixed(2)} m) es alto (referencia práctica: mín. entre 2×altura libre y 5 m). Todo tabique debe verificarse ante cargas sísmicas perpendiculares a su plano (E.070 Art. 67-71); a mayor espaciamiento, mayor exigencia sobre el tabique.`
      );
    }

    volumenConcretoColumnetas = input.numeroColumnetas * espesorM * peralteM * input.alturaLibre;
    encofradoColumnetas = 2 * peralteM * input.alturaLibre * input.numeroColumnetas;

    pesoAceroColumnetas = input.barrasColumneta.reduce(
      (acc, g) =>
        acc + Math.max(g.cantidad, 0) * input.alturaLibre * input.numeroColumnetas * getRebar(g.diametroId).weightKgPerM,
      0
    );
    const numeroBarras = input.barrasColumneta.reduce((acc, g) => acc + Math.max(g.cantidad, 0), 0);
    if (numeroBarras < 4) {
      warnings.push("Se recomienda un mínimo de 4 varillas longitudinales por columneta, como en las columnas de confinamiento (buena práctica constructiva, E.070 Art. 12).");
    }
    longitudBarras = numeroBarras * input.alturaLibre * input.numeroColumnetas;

    const rebarEstribo = getRebar(input.diametroEstribosColumnetaId);
    const separacionM = input.separacionEstribosColumneta / 100;
    const numeroEstribosPorColumneta = separacionM > 0 ? Math.floor(input.alturaLibre / separacionM) + 1 : 0;
    const numeroEstribosTotal = numeroEstribosPorColumneta * input.numeroColumnetas;
    const longitudGanchoEstribo = input.considerarGanchoEstribo
      ? longitudGanchoEstribo135(input.diametroEstribosColumnetaId)
      : 0;
    const longitudPorEstribo = 2 * (input.espesor / 100 - 2 * recubM) + 2 * (peralteM - 2 * recubM) + longitudGanchoEstribo;
    longitudEstribos = longitudPorEstribo * numeroEstribosTotal;
    pesoEstribosColumnetas = longitudEstribos * rebarEstribo.weightKgPerM;

    desgloseAcero = [
      ...input.barrasColumneta.map((g) => ({
        diametroId: g.diametroId,
        longitudM: Math.max(g.cantidad, 0) * input.alturaLibre * input.numeroColumnetas,
      })),
      { diametroId: input.diametroEstribosColumnetaId, longitudM: longitudEstribos },
    ];
  }

  const pesoAceroTotal = pesoAceroColumnetas + pesoEstribosColumnetas;
  const longitudTotalFierro = longitudBarras + longitudEstribos;

  if (input.incluirArriostres && input.recubrimiento * 2 >= Math.min(input.peralteColumneta, input.espesor)) {
    warnings.push("El recubrimiento indicado es demasiado grande respecto a la sección de la columneta.");
  }

  return {
    areaMuroBruta,
    areaMuroNeta,
    numeroUnidades,
    unidadesPorM2,
    volumenMortero,
    volumenConcretoColumnetas,
    encofradoColumnetas,
    pesoAceroColumnetas,
    pesoEstribosColumnetas,
    pesoAceroTotal,
    longitudTotalFierro,
    espaciamientoMaximoArriostresM,
    desgloseAcero,
    warnings,
  };
}
