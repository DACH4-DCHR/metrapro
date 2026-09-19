// Agrupación de partidas: el consolidado plano (todo el proyecto junto, lo
// que ya usan el Cuadro de Metrados Consolidado y el cálculo de materiales)
// y el consolidado por módulo (mismas partidas, pero organizadas por
// elemento — zapatas, vigas, losas, etc. — para el Presupuesto Referencial).
import type { CalculatedElement, MetradoLine, ModuleType } from "./types";
import { MODULE_LABELS } from "./moduleLabels";

// Mismo orden constructivo/normativo del menú (ver navGroups en Layout.tsx):
// movimiento de tierras primero, cimentación de abajo hacia arriba, luego
// superestructura, y arquitectura al final.
export const MODULE_ORDER: ModuleType[] = [
  "movimientoTierras",
  "zapata",
  "cimientoCorrido",
  "sobrecimiento",
  "vigaCimentacion",
  "columna",
  "placa",
  "muroAlbanileria",
  "viga",
  "losa",
  "losaMaciza",
  "escalera",
  "muroArquitectura",
  "acabados",
];

// Suma cantidades de partidas repetidas (mismo texto + unidad) dentro de una
// lista de líneas. Algunas partidas comparten texto entre módulos distintos
// (ej. "Refine y nivelación de fondo de excavación" aparece igual en
// Zapatas, Cimiento Corrido y Vigas de Cimentación) — eso no es un problema
// aquí porque cada llamada a esta función ya recibe las líneas de un solo
// grupo (todo el proyecto, o un módulo puntual), nunca mezcla grupos.
export function consolidateLines(allLines: MetradoLine[][]): MetradoLine[] {
  const map = new Map<string, MetradoLine>();
  for (const lines of allLines) {
    for (const line of lines) {
      const key = `${line.partida}__${line.unidad}`;
      const existing = map.get(key);
      if (existing) {
        existing.cantidad += line.cantidad;
      } else {
        map.set(key, { ...line });
      }
    }
  }
  return Array.from(map.values());
}

export interface ModuleGroup {
  module: ModuleType;
  label: string;
  lines: MetradoLine[];
}

// Agrupa las líneas de los elementos guardados por módulo, en el orden del
// menú, consolidando las partidas repetidas DENTRO de cada módulo — nunca
// entre módulos distintos, aunque el texto de la partida coincida.
export function consolidateLinesByModule(elements: CalculatedElement[]): ModuleGroup[] {
  const byModule = new Map<ModuleType, MetradoLine[][]>();
  for (const el of elements) {
    if (!byModule.has(el.module)) byModule.set(el.module, []);
    byModule.get(el.module)!.push(el.lines);
  }
  return MODULE_ORDER.filter((m) => byModule.has(m)).map((m) => ({
    module: m,
    label: MODULE_LABELS[m],
    lines: consolidateLines(byModule.get(m)!),
  }));
}
