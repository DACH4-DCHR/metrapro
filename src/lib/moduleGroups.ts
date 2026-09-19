import type { ModuleType } from "./types";

// Agrupa cada módulo en una de las 2 familias que ya se ven en el menú
// (títulos "Metrados Estructurales" / "Acabados y Adicionales") — la usan los
// 2 dashboards independientes para filtrar qué elementos les corresponden.
// Todo módulo nuevo que se agregue bajo "Acabados y Adicionales" (pisos,
// carpintería, aparatos sanitarios, etc.) debe sumarse aquí también.
// Nombrado "ModuleFamily" (no "ModuleGroup") para no chocar con el
// ModuleGroup ya existente en consolidate.ts, que es otra cosa (un grupo de
// líneas de un módulo puntual, no una de estas 2 familias).
export type ModuleFamily = "estructural" | "acabados";

export const MODULE_GROUP: Record<ModuleType, ModuleFamily> = {
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
