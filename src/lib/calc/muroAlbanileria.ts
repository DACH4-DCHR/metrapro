import { getRebar } from "../materials";
import type { BarraGrupo } from "./viga";

export type { BarraGrupo };

export interface MuroAlbanileriaInput {
  longitud: number; // m, longitud total de muro (todos los paños)
  alturaLibre: number; // m, altura libre entre arriostres horizontales
  espesor: number; // cm, espesor efectivo del muro "t"

  largoUnidad: number; // cm (unidad de albañilería, cara vista)
  alturaUnidad: number; // cm (unidad de albañilería, cara vista)
  juntaMortero: number; // cm, típico 1.5 cm
  desperdicioPct: number; // %

  incluirConfinamiento: boolean;
  numeroColumnas: number; // Nc >= 2
  peralteColumna: number; // cm, mín. 250 mm (Art. 11.6)
  barrasColumna: BarraGrupo[];
  diametroEstribosColumnaId: string;
  separacionConfinamiento: number; // cm, zona confinada en extremos (típico 10 cm)
  separacionCentral: number; // cm, resto de la columna (típico 25 cm)

  peralteSolera: number; // cm
  barrasSolera: BarraGrupo[];
  diametroEstribosSoleraId: string;

  recubrimiento: number; // cm
}

export interface MuroAlbanileriaResult {
  areaMuroBruta: number; // m2
  areaColumnas: number; // m2, área de columnas en la cara del muro (se descuenta de unidades/mortero)
  areaMuroNeta: number; // m2
  numeroUnidades: number;
  volumenMuroNeto: number; // m3
  volumenUnidades: number; // m3
  volumenMortero: number; // m3
  volumenConcretoConfinamiento: number; // m3
  encofradoConfinamiento: number; // m2
  pesoAceroColumnas: number; // kg
  pesoAceroSoleras: number; // kg
  pesoEstribosColumnas: number; // kg
  pesoEstribosSoleras: number; // kg
  pesoAceroTotal: number; // kg
  longitudTotalFierro: number; // m
  espesorMinimoCm: number; // h/20, Art. 19
  espaciamientoMaximoColumnasM: number; // mín(2h, 5m), Art. 44.3
  warnings: string[];
}

const GANCHO_ESTRIBO_M = 0.2;

export function calcularMuroAlbanileria(input: MuroAlbanileriaInput): MuroAlbanileriaResult {
  const warnings: string[] = [];
  const espesorM = input.espesor / 100;
  const recubM = input.recubrimiento / 100;

  const areaMuroBruta = input.longitud * input.alturaLibre;

  const espesorMinimoCm = (input.alturaLibre * 100) / 20;
  if (input.espesor < espesorMinimoCm) {
    warnings.push(
      `El espesor efectivo (${input.espesor} cm) es menor al mínimo de ${espesorMinimoCm.toFixed(1)} cm (altura libre/20, E.060 Art. 19).`
    );
  }

  const peralteColumnaM = input.peralteColumna / 100;
  const peralteSoleraM = input.peralteSolera / 100;

  const areaColumnas = input.incluirConfinamiento ? input.numeroColumnas * peralteColumnaM * input.alturaLibre : 0;
  const areaMuroNeta = Math.max(areaMuroBruta - areaColumnas, 0);

  const largoUnidadM = input.largoUnidad / 100;
  const alturaUnidadM = input.alturaUnidad / 100;
  const juntaM = input.juntaMortero / 100;
  const areaUnidadEfectiva = (largoUnidadM + juntaM) * (alturaUnidadM + juntaM);
  const numeroUnidadesNeto = areaUnidadEfectiva > 0 ? areaMuroNeta / areaUnidadEfectiva : 0;
  const numeroUnidades = Math.ceil(numeroUnidadesNeto * (1 + input.desperdicioPct / 100));

  const volumenMuroNeto = areaMuroNeta * espesorM;
  const volumenUnidades = numeroUnidadesNeto * largoUnidadM * alturaUnidadM * espesorM;
  const volumenMortero = Math.max(volumenMuroNeto - volumenUnidades, 0);

  let volumenConcretoConfinamiento = 0;
  let encofradoConfinamiento = 0;
  let pesoAceroColumnas = 0;
  let pesoAceroSoleras = 0;
  let pesoEstribosColumnas = 0;
  let pesoEstribosSoleras = 0;
  let longitudBarrasConfinamiento = 0;
  let longitudEstribosConfinamiento = 0;

  if (input.incluirConfinamiento) {
    if (input.numeroColumnas < 2) {
      warnings.push("El número de columnas de confinamiento no debe ser menor que 2 (Nc ≥ 2, E.060 Art. 30.1).");
    }
    if (input.peralteColumna < 25) {
      warnings.push("El peralte de la columna de confinamiento es menor a 25 cm, el mínimo según E.060 Art. 11.6.");
    }

    const espaciamientoActual = input.numeroColumnas > 1 ? input.longitud / (input.numeroColumnas - 1) : input.longitud;
    const espaciamientoMaximoColumnasM = Math.min(2 * input.alturaLibre, 5);
    if (espaciamientoActual > espaciamientoMaximoColumnasM) {
      warnings.push(
        `El espaciamiento entre columnas (${espaciamientoActual.toFixed(2)} m) supera el máximo de ${espaciamientoMaximoColumnasM.toFixed(
          2
        )} m (mín. entre 2×altura libre y 5 m, E.060 Art. 44.3).`
      );
    }

    const numeroBarrasColumna = input.barrasColumna.reduce((acc, g) => acc + Math.max(g.cantidad, 0), 0);
    if (numeroBarrasColumna < 4) {
      warnings.push(
        "El refuerzo longitudinal de la columna de confinamiento debe ser como mínimo 4 varillas (E.060 Art. 29.4, Tabla 10)."
      );
    }
    const numeroBarrasSolera = input.barrasSolera.reduce((acc, g) => acc + Math.max(g.cantidad, 0), 0);
    if (numeroBarrasSolera < 4) {
      warnings.push(
        "El refuerzo longitudinal de la viga solera debe ser como mínimo 4 varillas (E.060 Art. 29.4, Tabla 10)."
      );
    }
    if (input.separacionConfinamiento > 10) {
      warnings.push(
        "La separación de estribos en la zona confinada de los extremos supera el máximo sugerido de 10 cm (E.060 Art. 29.4, Tabla 10)."
      );
    }
    if (input.separacionCentral > 25) {
      warnings.push(
        "La separación de estribos en la zona central supera el máximo sugerido de 25 cm (E.060 Art. 29.4, Tabla 10)."
      );
    }

    volumenConcretoConfinamiento =
      input.numeroColumnas * espesorM * peralteColumnaM * input.alturaLibre + espesorM * peralteSoleraM * input.longitud;

    encofradoConfinamiento =
      2 * peralteColumnaM * input.alturaLibre * input.numeroColumnas +
      (2 * peralteSoleraM + espesorM) * input.longitud;

    pesoAceroColumnas = input.barrasColumna.reduce(
      (acc, g) => acc + Math.max(g.cantidad, 0) * input.alturaLibre * input.numeroColumnas * getRebar(g.diametroId).weightKgPerM,
      0
    );
    pesoAceroSoleras = input.barrasSolera.reduce(
      (acc, g) => acc + Math.max(g.cantidad, 0) * input.longitud * getRebar(g.diametroId).weightKgPerM,
      0
    );
    longitudBarrasConfinamiento =
      numeroBarrasColumna * input.alturaLibre * input.numeroColumnas + numeroBarrasSolera * input.longitud;

    const rebarEstriboColumna = getRebar(input.diametroEstribosColumnaId);
    const separacionConfM = input.separacionConfinamiento / 100;
    const separacionCentralM = input.separacionCentral / 100;
    const numeroEstribosConfPorExtremo = separacionConfM > 0 ? 4 : 0;
    const alturaConfinadaM = numeroEstribosConfPorExtremo * separacionConfM;
    const alturaCentralM = Math.max(input.alturaLibre - 2 * alturaConfinadaM, 0);
    const numeroEstribosCentral = separacionCentralM > 0 ? Math.max(Math.floor(alturaCentralM / separacionCentralM) - 1, 0) : 0;
    const numeroEstribosPorColumna = 2 * numeroEstribosConfPorExtremo + numeroEstribosCentral;
    const numeroEstribosColumnaTotal = numeroEstribosPorColumna * input.numeroColumnas;
    const longitudPorEstriboColumna = 2 * (input.espesor / 100 - 2 * recubM) + 2 * (peralteColumnaM - 2 * recubM) + GANCHO_ESTRIBO_M;
    const longitudTotalEstribosColumna = longitudPorEstriboColumna * numeroEstribosColumnaTotal;
    pesoEstribosColumnas = longitudTotalEstribosColumna * rebarEstriboColumna.weightKgPerM;

    const rebarEstriboSolera = getRebar(input.diametroEstribosSoleraId);
    const numeroEstribosSolera = separacionCentralM > 0 ? Math.floor(input.longitud / separacionCentralM) + 1 : 0;
    const longitudPorEstriboSolera = 2 * (input.espesor / 100 - 2 * recubM) + 2 * (peralteSoleraM - 2 * recubM) + GANCHO_ESTRIBO_M;
    const longitudTotalEstribosSolera = longitudPorEstriboSolera * numeroEstribosSolera;
    pesoEstribosSoleras = longitudTotalEstribosSolera * rebarEstriboSolera.weightKgPerM;

    longitudEstribosConfinamiento = longitudTotalEstribosColumna + longitudTotalEstribosSolera;
  }

  const pesoAceroTotal = pesoAceroColumnas + pesoAceroSoleras + pesoEstribosColumnas + pesoEstribosSoleras;
  const longitudTotalFierro = longitudBarrasConfinamiento + longitudEstribosConfinamiento;

  if (input.recubrimiento * 2 >= Math.min(input.peralteColumna, input.espesor)) {
    warnings.push("El recubrimiento indicado es demasiado grande respecto a la sección de la columna de confinamiento.");
  }

  return {
    areaMuroBruta,
    areaColumnas,
    areaMuroNeta,
    numeroUnidades,
    volumenMuroNeto,
    volumenUnidades,
    volumenMortero,
    volumenConcretoConfinamiento,
    encofradoConfinamiento,
    pesoAceroColumnas,
    pesoAceroSoleras,
    pesoEstribosColumnas,
    pesoEstribosSoleras,
    pesoAceroTotal,
    longitudTotalFierro,
    espesorMinimoCm,
    espaciamientoMaximoColumnasM: Math.min(2 * input.alturaLibre, 5),
    warnings,
  };
}
