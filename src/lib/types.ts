export type ModuleType =
  | "losa"
  | "viga"
  | "escalera"
  | "movimientoTierras"
  | "zapata"
  | "cimientoCorrido"
  | "sobrecimiento"
  | "vigaCimentacion"
  | "columna"
  | "placa"
  | "muroAlbanileria"
  | "losaMaciza"
  | "muroArquitectura"
  | "tarrajeoInteriores"
  | "tarrajeoExteriores"
  | "tarrajeoEscalera"
  | "pisosPavimentos"
  | "pintura"
  | "cielorraso"
  | "obrasProvisionales"
  | "carpinteria";

// Cómo repartir el costo de una partida entre mano de obra y materiales en el
// Dashboard cuando no tiene un APU real. "mixto" (el default de siempre) usa
// el % referencial por categoría — ver PCT_MANO_OBRA en dashboardCharts.ts.
// Solo lo usan las partidas que el usuario agrega a mano (ver
// PresupuestoCustomLine en presupuesto.ts); un APU, si existe, manda sobre
// esto (ver manoObraVsMateriales).
export type TipoCosto = "manoObra" | "materiales" | "mixto";

export interface MetradoLine {
  partida: string;
  unidad: string;
  cantidad: number;
  tipoCosto?: TipoCosto;
}

// Longitud de acero de refuerzo de un diámetro específico, para un rol dentro de un
// elemento (ej. "longitudinal", "estribos", "temperatura"). Varias entradas pueden
// compartir el mismo diametroId; se agrupan al resumir (ver lib/calc/aceroResumen.ts).
export interface AceroItem {
  diametroId: string;
  longitudM: number;
}

export interface CalculatedElement {
  id: string;
  module: ModuleType;
  name: string;
  createdAt: number;
  // Totales usados por el Dashboard (unidades homogéneas: m3, kg, m2, und)
  concreteM3: number;
  steelKg: number;
  formworkM2: number;
  lines: MetradoLine[];
  inputsSummary: Record<string, string>;
  // Desglose de acero por diámetro (sin agrupar), para el resumen de habilitación de
  // acero del Dashboard. Opcional: los elementos guardados antes de esta funcionalidad,
  // o de módulos sin acero (cimiento corrido, sobrecimiento), no lo tendrán.
  steelByDiameter?: AceroItem[];
}
