import {
  CONCRETE_DENSITY_KG_M3,
  getHollowBlockMaterial,
  hollowBlockWeightKg,
  getRebar,
  type HollowBlockMaterialId,
} from "../materials";
import type { AceroItem } from "./aceroResumen";

export type AceroViguetasMetodo = "ratio" | "barras";

export interface LosaAligeradaInput {
  largo: number; // m
  ancho: number; // m
  espesorLosa: number; // cm
  separacionViguetas: number; // cm (eje a eje)
  anchoVigueta: number; // cm (ancho del nervio, típico 10 cm)
  tipoLadrillo: "12" | "15" | "20" | "personalizado";
  alturaLadrilloPersonalizado?: number; // cm, solo si personalizado
  materialLadrillo: HollowBlockMaterialId;
  temperaturaDiametroId: string; // Ø barra temperatura
  temperaturaSeparacion: number; // cm
  aceroViguetasMetodo: AceroViguetasMetodo;
  ratioAceroViguetasKgM2: number; // kg/m2 estimado (método "ratio")
  numeroVarillasPorVigueta: number; // método "barras"
  diametroVarillaViguetaId: string; // método "barras"
  desperdicioLadrilloPct: number; // %

  // Acero negativo de vigueta (bastones sobre apoyos intermedios, para continuidad).
  incluirAceroNegativo: boolean;
  diametroNegativoId: string;
  numeroBastonesPorVigueta: number; // total de bastones por vigueta (ej. 1 por apoyo intermedio)
  longitudBaston: number; // m, longitud de cada bastón (típico: L/4 de cada tramo adyacente)
}

export interface LosaAligeradaResult {
  areaLosa: number;
  espesorLosaM: number;
  alturaLadrilloM: number;
  capaCompresionM: number;
  anchoViguetaM: number;
  separacionViguetasM: number;
  numeroViguetas: number;
  longitudViguetas: number;
  volumenNervios: number;
  volumenCapaCompresion: number;
  volumenConcreto: number;
  ladrillosPorM2: number;
  numeroLadrillos: number;
  pesoLadrillos: number;
  pesoConcreto: number;
  aceroTemperaturaKg: number;
  aceroViguetasKg: number;
  longitudTotalAceroNegativo: number;
  aceroNegativoKg: number;
  aceroTotalKg: number;
  encofradoM2: number;
  pesoTotalMateriales: number;
  desgloseAcero: AceroItem[];
  warnings: string[];
}

export function calcularLosaAligerada(input: LosaAligeradaInput): LosaAligeradaResult {
  const warnings: string[] = [];

  const areaLosa = input.largo * input.ancho;
  const espesorLosaM = input.espesorLosa / 100;
  const isCustomHeight = input.tipoLadrillo === "personalizado";
  const alturaLadrilloCm = isCustomHeight
    ? input.alturaLadrilloPersonalizado ?? 0
    : Number(input.tipoLadrillo);
  const alturaLadrilloM = alturaLadrilloCm / 100;
  const capaCompresionM = espesorLosaM - alturaLadrilloM;

  if (capaCompresionM <= 0) {
    warnings.push(
      "El espesor de losa debe ser mayor que la altura del ladrillo aligerante (capa de compresión inválida)."
    );
  } else if (capaCompresionM < 0.04) {
    warnings.push("La capa de compresión resultante es menor a 4 cm, revisar según norma E.060.");
  }

  const anchoViguetaM = input.anchoVigueta / 100;
  const separacionViguetasM = input.separacionViguetas / 100;

  // Longitud total de viguetas = Área techada / separación entre ejes (fórmula estándar
  // de metrado en el Perú). Equivale a considerar (Ancho/separación) viguetas de longitud
  // "Largo" cada una; con esto el volumen de nervios + capa de compresión reconcilia
  // exactamente con el volumen total de concreto calculado por m².
  const longitudViguetas = separacionViguetasM > 0 ? areaLosa / separacionViguetasM : 0;
  // N° de viguetas: solo referencial (conteo físico redondeado hacia arriba), no se usa
  // para ningún otro cálculo.
  const numeroViguetas = separacionViguetasM > 0 ? Math.ceil(input.ancho / separacionViguetasM) : 0;

  const capaEfectiva = Math.max(capaCompresionM, 0);
  // Volumen por m2 = [b0*h + (s-b0)*ec] / s  (sección equivalente por franja s)
  const volumenPorM2 =
    separacionViguetasM > 0
      ? (anchoViguetaM * espesorLosaM + Math.max(separacionViguetasM - anchoViguetaM, 0) * capaEfectiva) /
        separacionViguetasM
      : espesorLosaM;

  const volumenConcreto = areaLosa * volumenPorM2;
  const volumenNervios = anchoViguetaM * espesorLosaM * longitudViguetas;
  const volumenCapaCompresion = Math.max(volumenConcreto - volumenNervios, 0);

  // El largo del bloque depende del material: el ladrillo de arcilla es de 0.30 m,
  // pero el casetón de tecnopor comercial es de 1.20 m (4 veces más largo), por lo
  // que se necesitan ~4 veces menos unidades por m² con tecnopor.
  const largoBloqueM = getHollowBlockMaterial(input.materialLadrillo).lengthM;
  const ladrillosPorM2 = separacionViguetasM > 0 ? 1 / (separacionViguetasM * largoBloqueM) : 0;
  const numeroLadrillosNeto = ladrillosPorM2 * areaLosa;
  const numeroLadrillos = Math.ceil(numeroLadrillosNeto * (1 + input.desperdicioLadrilloPct / 100));

  const pesoUnitarioLadrillo = hollowBlockWeightKg(input.materialLadrillo, alturaLadrilloCm, isCustomHeight);
  const pesoLadrillos = numeroLadrillos * pesoUnitarioLadrillo;

  const pesoConcreto = volumenConcreto * CONCRETE_DENSITY_KG_M3;

  const rebarTemp = getRebar(input.temperaturaDiametroId);
  const separacionTempM = input.temperaturaSeparacion / 100;
  const numeroBarrasTemp = separacionTempM > 0 ? Math.ceil(input.ancho / separacionTempM) : 0;
  const longitudBarrasTemp = numeroBarrasTemp * input.largo;
  const aceroTemperaturaKg = longitudBarrasTemp * rebarTemp.weightKgPerM;

  const aceroViguetasKg =
    input.aceroViguetasMetodo === "barras"
      ? input.numeroVarillasPorVigueta * longitudViguetas * getRebar(input.diametroVarillaViguetaId).weightKgPerM
      : input.ratioAceroViguetasKgM2 * areaLosa;

  const longitudTotalAceroNegativo = input.incluirAceroNegativo
    ? Math.max(input.numeroBastonesPorVigueta, 0) * Math.max(input.longitudBaston, 0) * numeroViguetas
    : 0;
  const aceroNegativoKg = longitudTotalAceroNegativo * getRebar(input.diametroNegativoId).weightKgPerM;

  const aceroTotalKg = aceroTemperaturaKg + aceroViguetasKg + aceroNegativoKg;

  const encofradoM2 = areaLosa;

  const pesoTotalMateriales = pesoConcreto + pesoLadrillos + aceroTotalKg;

  const desgloseAcero: AceroItem[] = [
    { diametroId: input.temperaturaDiametroId, longitudM: longitudBarrasTemp },
    ...(input.aceroViguetasMetodo === "barras"
      ? [{ diametroId: input.diametroVarillaViguetaId, longitudM: input.numeroVarillasPorVigueta * longitudViguetas }]
      : []),
    ...(input.incluirAceroNegativo
      ? [{ diametroId: input.diametroNegativoId, longitudM: longitudTotalAceroNegativo }]
      : []),
  ];

  return {
    areaLosa,
    espesorLosaM,
    alturaLadrilloM,
    capaCompresionM,
    anchoViguetaM,
    separacionViguetasM,
    numeroViguetas,
    longitudViguetas,
    volumenNervios,
    volumenCapaCompresion,
    volumenConcreto,
    ladrillosPorM2,
    numeroLadrillos,
    pesoLadrillos,
    pesoConcreto,
    aceroTemperaturaKg,
    aceroViguetasKg,
    longitudTotalAceroNegativo,
    aceroNegativoKg,
    aceroTotalKg,
    encofradoM2,
    pesoTotalMateriales,
    desgloseAcero,
    warnings,
  };
}
