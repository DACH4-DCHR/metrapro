import type { ModuleType } from "./types";

// Agrupa cada módulo en una de las 2 familias que ya se ven en el menú
// (títulos "Metrados Estructurales" / "Acabados y Adicionales") — la usan los
// 2 dashboards independientes para filtrar qué elementos les corresponden.
// Todo módulo nuevo que se agregue bajo "Acabados y Adicionales" (pisos,
// carpintería, aparatos sanitarios, etc.) debe sumarse aquí también.
export type ModuleGroup = "estructural" | "acabados";

export const MODULE_GROUP: Record<ModuleType, ModuleGroup> = {
  movimientoTierras: "estructural",
  zapata: "estructural",
  cimientoCorrido: "estructural",
  sobrecimiento: "estructural",
  vigaCimentacion: "estructural",
  columna: "estructural",
  placa: "estructural",
  muroAlbanileria: "estructural",
  viga: "estructural",
  losa: "estructural",
  losaMaciza: "estructural",
  escalera: "estructural",
  muroArquitectura: "estructural",
  acabados: "acabados",
};
