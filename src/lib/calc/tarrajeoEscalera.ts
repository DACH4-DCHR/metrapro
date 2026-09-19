// Tarrajeo (garganta) y vestidura de pasos y contrapasos de una escalera: se
// reutiliza la misma geometría de tramos/descanso que el módulo estructural
// de Escalera (lib/calc/escalera.ts), pero sin acero ni concreto — acá solo
// interesan las áreas de acabado.
export type TipoEscaleraTarrajeo = "un_tramo" | "dos_tramos";

export interface TramoTarrajeoInput {
  numeroPasos: number;
  paso: number; // cm (huella)
  contrapaso: number; // cm (contrahuella)
}

export interface DescansoTarrajeoInput {
  ancho: number; // m
  largo: number; // m
}

export interface TarrajeoEscaleraInput {
  tipo: TipoEscaleraTarrajeo;
  anchoEscalera: number; // m
  tramo1: TramoTarrajeoInput;
  tramo2?: TramoTarrajeoInput; // requerido si tipo = dos_tramos
  descanso?: DescansoTarrajeoInput; // requerido si tipo = dos_tramos
  incluirTarrajeoGaganta: boolean;
  incluirVestiduraPasos: boolean;
}

interface TramoAreas {
  longitudInclinada: number;
  areaGaganta: number;
  areaVestidura: number;
}

export interface TarrajeoEscaleraResult {
  tramo1: TramoAreas;
  tramo2?: TramoAreas;
  areaDescanso: number;
  areaGargantaTotal: number;
  areaVestiduraTotal: number;
  warnings: string[];
}

function calcularTramoAreas(tramo: TramoTarrajeoInput, ancho: number): TramoAreas {
  const pasoM = tramo.paso / 100;
  const contrapasoM = tramo.contrapaso / 100;
  const desarrolloHorizontal = (tramo.numeroPasos - 1) * pasoM;
  const alturaTramo = tramo.numeroPasos * contrapasoM;
  const longitudInclinada = Math.sqrt(desarrolloHorizontal ** 2 + alturaTramo ** 2);
  const areaGaganta = longitudInclinada * ancho;
  const areaVestidura = tramo.numeroPasos * (pasoM + contrapasoM) * ancho;
  return { longitudInclinada, areaGaganta, areaVestidura };
}

export function calcularTarrajeoEscalera(input: TarrajeoEscaleraInput): TarrajeoEscaleraResult {
  const warnings: string[] = [];
  const tramo1 = calcularTramoAreas(input.tramo1, input.anchoEscalera);

  let tramo2: TramoAreas | undefined;
  let areaDescanso = 0;

  if (input.tipo === "dos_tramos") {
    if (!input.tramo2) {
      warnings.push("Debe completar los datos del Tramo 2 para este tipo de escalera.");
    } else {
      tramo2 = calcularTramoAreas(input.tramo2, input.anchoEscalera);
    }
    if (!input.descanso) {
      warnings.push("Debe completar las dimensiones del descanso (landing) para este tipo de escalera.");
    } else {
      areaDescanso = input.descanso.ancho * input.descanso.largo;
    }
  }

  const areaGargantaTotal = tramo1.areaGaganta + (tramo2?.areaGaganta ?? 0) + areaDescanso;
  const areaVestiduraTotal = tramo1.areaVestidura + (tramo2?.areaVestidura ?? 0);

  return { tramo1, tramo2, areaDescanso, areaGargantaTotal, areaVestiduraTotal, warnings };
}
