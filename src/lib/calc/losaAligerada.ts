import {
  CONCRETE_DENSITY_KG_M3,
  HOLLOW_BRICK_LENGTH_M,
  HOLLOW_BRICK_TYPES,
  getRebar,
} from "../materials";

export interface LosaAligeradaInput {
  largo: number; // m
  ancho: number; // m
  espesorLosa: number; // cm
  separacionViguetas: number; // cm (eje a eje)
  anchoVigueta: number; // cm (ancho del nervio, típico 10 cm)
  tipoLadrillo: "12" | "15" | "20" | "personalizado";
  alturaLadrilloPersonalizado?: number; // cm, solo si personalizado
  temperaturaDiametroId: string; // Ø barra temperatura
  temperaturaSeparacion: number; // cm
  ratioAceroViguetasKgM2: number; // kg/m2 estimado para acero principal de viguetas
  desperdicioLadrilloPct: number; // %
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
  aceroTotalKg: number;
  encofradoM2: number;
  pesoTotalMateriales: number;
  warnings: string[];
}

export function calcularLosaAligerada(input: LosaAligeradaInput): LosaAligeradaResult {
  const warnings: string[] = [];

  const areaLosa = input.largo * input.ancho;
  const espesorLosaM = input.espesorLosa / 100;
  const alturaLadrilloCm =
    input.tipoLadrillo === "personalizado"
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
  const numeroViguetas = separacionViguetasM > 0 ? Math.ceil(input.ancho / separacionViguetasM) + 1 : 0;
  const longitudViguetas = numeroViguetas * input.largo;

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

  const ladrillosPorM2 =
    separacionViguetasM > 0 ? 1 / (separacionViguetasM * HOLLOW_BRICK_LENGTH_M) : 0;
  const numeroLadrillosNeto = ladrillosPorM2 * areaLosa;
  const numeroLadrillos = Math.ceil(numeroLadrillosNeto * (1 + input.desperdicioLadrilloPct / 100));

  const brickType = HOLLOW_BRICK_TYPES.find((b) => b.id === input.tipoLadrillo);
  const pesoUnitarioLadrillo = brickType?.weightKg ?? alturaLadrilloCm * 0.37; // estimación lineal si es personalizado
  const pesoLadrillos = numeroLadrillos * pesoUnitarioLadrillo;

  const pesoConcreto = volumenConcreto * CONCRETE_DENSITY_KG_M3;

  const rebarTemp = getRebar(input.temperaturaDiametroId);
  const separacionTempM = input.temperaturaSeparacion / 100;
  const numeroBarrasTemp = separacionTempM > 0 ? Math.ceil(input.ancho / separacionTempM) : 0;
  const longitudBarrasTemp = numeroBarrasTemp * input.largo;
  const aceroTemperaturaKg = longitudBarrasTemp * rebarTemp.weightKgPerM;

  const aceroViguetasKg = input.ratioAceroViguetasKgM2 * areaLosa;
  const aceroTotalKg = aceroTemperaturaKg + aceroViguetasKg;

  const encofradoM2 = areaLosa;

  const pesoTotalMateriales = pesoConcreto + pesoLadrillos + aceroTotalKg;

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
    aceroTotalKg,
    encofradoM2,
    pesoTotalMateriales,
    warnings,
  };
}
