export type ModuleType =
  | "losa"
  | "viga"
  | "escalera"
  | "zapata"
  | "cimientoCorrido"
  | "sobrecimiento"
  | "vigaCimentacion"
  | "columna";

export interface MetradoLine {
  partida: string;
  unidad: string;
  cantidad: number;
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
}
