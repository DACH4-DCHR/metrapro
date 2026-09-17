// Presupuesto referencial: valoriza el cuadro de metrados consolidado con precios
// unitarios por partida, y agrega Gastos Generales, Utilidad e IGV (editables y
// opcionales) para llegar a un Total General. Lo comparten el Dashboard (pantalla)
// y los reportes de Excel/PDF, para que el número exportado sea siempre el mismo
// que se ve en pantalla.
import type { CalculatedElement, MetradoLine, ModuleType } from "./types";
import { defaultUnitPrice, priceKey } from "./pricing";
import { consolidateLinesByModule, type ModuleGroup } from "./consolidate";
import { MODULE_LABELS } from "./moduleLabels";

// Gastos Generales, Utilidad e IGV se guardan como llaves reservadas dentro del
// mismo mapa "prices" (ya persistido en el backend con setPrice/putPrices) en vez
// de agregar columnas nuevas al proyecto — evita una migración de base de datos
// para 6 valores simples, y nunca chocan con una llave real de partida (que
// siempre trae "__<unidad>" al final, nunca estos sufijos).
export const GG_PCT_KEY = "__gastosGenerales_pct";
export const GG_ON_KEY = "__gastosGenerales_on";
export const UT_PCT_KEY = "__utilidad_pct";
export const UT_ON_KEY = "__utilidad_on";
export const IGV_PCT_KEY = "__igv_pct";
export const IGV_ON_KEY = "__igv_on";
export const GG_PCT_DEFAULT = 10;
export const UT_PCT_DEFAULT = 10;
export const IGV_PCT_DEFAULT = 18;

export interface PresupuestoRow {
  key: string;
  line: MetradoLine;
  price: number;
  subtotal: number;
}

export interface PresupuestoTotales {
  rows: PresupuestoRow[];
  costoDirecto: number;
  ggOn: boolean;
  ggPct: number;
  montoGG: number;
  utOn: boolean;
  utPct: number;
  montoUT: number;
  igvOn: boolean;
  igvPct: number;
  montoIGV: number;
  totalGeneral: number;
}

// Valoriza cualquier lista de líneas de metrado con los precios del proyecto
// (o el precio referencial por defecto según unidad, si aún no se editó). Es el
// núcleo que reutilizan tanto el Presupuesto Referencial (que además le suma
// Gastos Generales/Utilidad/IGV) como el costo de materiales, que no necesita
// esa capa adicional.
export function valorizarLineas(lines: MetradoLine[], prices: Record<string, number>): { rows: PresupuestoRow[]; total: number } {
  let total = 0;
  const rows: PresupuestoRow[] = lines.map((line) => {
    const key = priceKey(line.partida, line.unidad);
    const price = prices[key] ?? defaultUnitPrice(line.unidad);
    const subtotal = price * line.cantidad;
    total += subtotal;
    return { key, line, price, subtotal };
  });
  return { rows, total };
}

export interface PresupuestoModuloGroup {
  module: ModuleType;
  label: string;
  rows: PresupuestoRow[];
  subtotal: number;
}

const ACERO_LINE_RE = /^Acero de refuerzo Ø/;
const VARILLA_LINE_RE = /^Varillas Ø/;
export const ACERO_PRESUPUESTO_PARTIDA = "Acero fy=4200 Kg/cm2 Grado 60";

// El Presupuesto Referencial no valoriza el acero por diámetro (ese detalle ya
// está en "Acero de refuerzo por Diámetro y Elemento", en el Cuadro de
// Metrados Consolidado y en los reportes) ni las varillas comerciales (esas
// son solo referencia de compra en unidades, no una partida de costo aparte
// — dejarlas priceable duplicaba el costo del mismo acero). Aquí se juntan
// todas las líneas de acero de un grupo en una sola partida estándar (un
// precio de kg de acero fy=4200 Grado 60, sin importar el diámetro), como se
// presupuesta en la práctica. Solo afecta esta valorización — el resto de la
// app (metrados, acero por diámetro) sigue mostrando el detalle completo.
function consolidarAceroParaPresupuesto(lines: MetradoLine[]): MetradoLine[] {
  let pesoAceroTotal = 0;
  let insertIndex = -1;
  const result: MetradoLine[] = [];
  for (const line of lines) {
    if (VARILLA_LINE_RE.test(line.partida)) continue;
    if (ACERO_LINE_RE.test(line.partida)) {
      pesoAceroTotal += line.cantidad;
      if (insertIndex === -1) {
        insertIndex = result.length;
        result.push({ partida: ACERO_PRESUPUESTO_PARTIDA, unidad: "kg", cantidad: 0 });
      }
      continue;
    }
    result.push(line);
  }
  if (insertIndex !== -1) {
    result[insertIndex] = { ...result[insertIndex], cantidad: pesoAceroTotal };
  }
  return result;
}

// Partidas de movimiento de tierras que se generan dentro de otros elementos
// que excavan (zapatas, cimiento corrido, vigas de cimentación, ...) pero que,
// en la práctica, se presupuestan como parte de Movimiento de Tierras para
// toda la obra — no repartidas por elemento. La excavación se reconoce por
// prefijo (cada módulo trae su propio texto: "Excavación para zapatas
// aisladas", "Excavación de zanjas para cimiento corrido", etc.) y, si dos
// elementos comparten exactamente el mismo texto, se suman entre sí igual que
// las demás; si no, quedan como líneas separadas dentro del grupo de
// Movimiento de Tierras.
const PARTIDA_REFINE = "Refine y nivelación de fondo de excavación";
const PARTIDA_RELLENO = "Relleno y compactado con material propio";
const PARTIDA_ELIMINACION = "Eliminación de material excedente";
// Orden constructivo real (excavar, luego rellenar y eliminar excedente), no
// el orden en que se procesan los módulos internamente.
const ORDEN_PARTIDAS_COMPARTIDAS = [PARTIDA_REFINE, PARTIDA_RELLENO, PARTIDA_ELIMINACION];
const PARTIDAS_MOVIMIENTO_TIERRAS_COMPARTIDAS = new Set<string>(ORDEN_PARTIDAS_COMPARTIDAS);
const EXCAVACION_RE = /^Excavación/;
const MODULO_MOVIMIENTO_TIERRAS: ModuleType = "movimientoTierras";

// Reutilizado por el gráfico "Costo directo por categoría" (dashboardCharts.ts)
// para que "Movimiento de Tierras" ahí sea exactamente el mismo conjunto de
// partidas que este módulo agrupa en el Presupuesto Referencial.
export function esPartidaMovimientoTierras(partida: string): boolean {
  return EXCAVACION_RE.test(partida) || PARTIDAS_MOVIMIENTO_TIERRAS_COMPARTIDAS.has(partida);
}

// Saca las partidas de movimiento de tierras de todos los módulos (incluido
// Movimiento de Tierras mismo, para que el orden final no dependa de si su
// propia excavación ya estaba ahí) y arma el grupo de Movimiento de Tierras
// con un orden fijo: primero todas las excavaciones (una por cada texto
// distinto — zapatas, cimiento corrido, vigas de cimentación, ...; las que
// comparten el mismo texto se suman entre sí), y después refine, relleno y
// eliminación de material excedente.
function consolidarMovimientoTierras(groups: ModuleGroup[]): ModuleGroup[] {
  const excavaciones = new Map<string, MetradoLine>();
  const compartidas = new Map<string, MetradoLine>();
  const gruposSinMovimientoTierras = groups.map((group) => {
    const lineasRestantes: MetradoLine[] = [];
    for (const line of group.lines) {
      const destino = EXCAVACION_RE.test(line.partida)
        ? excavaciones
        : PARTIDAS_MOVIMIENTO_TIERRAS_COMPARTIDAS.has(line.partida)
          ? compartidas
          : null;
      if (!destino) {
        lineasRestantes.push(line);
        continue;
      }
      const key = `${line.partida}__${line.unidad}`;
      const existing = destino.get(key);
      if (existing) existing.cantidad += line.cantidad;
      else destino.set(key, { ...line });
    }
    return { ...group, lines: lineasRestantes };
  });

  if (excavaciones.size === 0 && compartidas.size === 0) return gruposSinMovimientoTierras;

  const lineasMovimientoTierras: MetradoLine[] = [
    ...excavaciones.values(),
    ...ORDEN_PARTIDAS_COMPARTIDAS.map((partida) =>
      Array.from(compartidas.values()).find((l) => l.partida === partida)
    ).filter((l): l is MetradoLine => l !== undefined),
  ];

  const indiceMovimientoTierras = gruposSinMovimientoTierras.findIndex((g) => g.module === MODULO_MOVIMIENTO_TIERRAS);
  if (indiceMovimientoTierras === -1) {
    const nuevoGrupo: ModuleGroup = {
      module: MODULO_MOVIMIENTO_TIERRAS,
      label: MODULE_LABELS[MODULO_MOVIMIENTO_TIERRAS],
      lines: lineasMovimientoTierras,
    };
    return [nuevoGrupo, ...gruposSinMovimientoTierras];
  }

  return gruposSinMovimientoTierras.map((group, i) =>
    i === indiceMovimientoTierras ? { ...group, lines: [...lineasMovimientoTierras, ...group.lines] } : group
  );
}

// Mismas partidas y precios que calcularPresupuesto, pero organizadas por
// elemento (zapatas, vigas, losas, ...) en vez de en una sola lista plana —
// así se ve el Presupuesto Referencial en pantalla y en los reportes. La
// suma de los subtotales de cada grupo da exactamente el mismo costo directo
// que calcularPresupuesto (mismo precio por partida, sin importar cómo se
// agrupen las líneas), así que esta función NO reemplaza a calcularPresupuesto
// — los totales con Gastos Generales/Utilidad/IGV se siguen calculando ahí.
export function agruparPresupuestoPorModulo(
  elements: CalculatedElement[],
  prices: Record<string, number>
): PresupuestoModuloGroup[] {
  const groups = consolidarMovimientoTierras(consolidateLinesByModule(elements));
  return groups.map((group) => {
    const { rows, total } = valorizarLineas(consolidarAceroParaPresupuesto(group.lines), prices);
    return { module: group.module, label: group.label, rows, subtotal: total };
  });
}

// extraLines suma partidas que no vienen de elementos calculados (movilización
// de equipo, partidas adicionales agregadas a mano) al mismo costo directo —
// así el Total General del Presupuesto Referencial las incluye sin importar
// dónde se llame calcularPresupuesto (pantalla, PDF o Excel).
export function calcularPresupuesto(
  consolidated: MetradoLine[],
  prices: Record<string, number>,
  extraLines: MetradoLine[] = []
): PresupuestoTotales {
  const { rows, total: costoDirecto } = valorizarLineas(
    [...consolidarAceroParaPresupuesto(consolidated), ...extraLines],
    prices
  );

  const ggOn = (prices[GG_ON_KEY] ?? 0) === 1;
  const ggPct = prices[GG_PCT_KEY] ?? GG_PCT_DEFAULT;
  const utOn = (prices[UT_ON_KEY] ?? 0) === 1;
  const utPct = prices[UT_PCT_KEY] ?? UT_PCT_DEFAULT;
  const igvOn = (prices[IGV_ON_KEY] ?? 0) === 1;
  const igvPct = prices[IGV_PCT_KEY] ?? IGV_PCT_DEFAULT;

  const montoGG = ggOn ? costoDirecto * (ggPct / 100) : 0;
  const montoUT = utOn ? costoDirecto * (utPct / 100) : 0;
  const montoIGV = igvOn ? (costoDirecto + montoGG + montoUT) * (igvPct / 100) : 0;
  const totalGeneral = costoDirecto + montoGG + montoUT + montoIGV;

  return { rows, costoDirecto, ggOn, ggPct, montoGG, utOn, utPct, montoUT, igvOn, igvPct, montoIGV, totalGeneral };
}

// Filas de totales del presupuesto (costo directo + GG/Utilidad/IGV activos +
// total general), listas para agregar como "foot" de una tabla. Recibe un
// formateador porque Excel necesita el número crudo (con 2 decimales) y el PDF
// necesita el texto ya formateado en soles — así ambos exportadores muestran
// exactamente las mismas filas sin duplicar esta lógica.
export function buildPresupuestoFootRows(
  presupuesto: PresupuestoTotales,
  fmt: (n: number) => string | number
): (string | number)[][] {
  const rows: (string | number)[][] = [["", "", "", "Costo directo (S/.)", fmt(presupuesto.costoDirecto)]];
  if (presupuesto.ggOn) {
    rows.push(["", "", "", `Gastos Generales (${presupuesto.ggPct}%)`, fmt(presupuesto.montoGG)]);
  }
  if (presupuesto.utOn) {
    rows.push(["", "", "", `Utilidad (${presupuesto.utPct}%)`, fmt(presupuesto.montoUT)]);
  }
  if (presupuesto.igvOn) {
    rows.push(["", "", "", `IGV (${presupuesto.igvPct}%)`, fmt(presupuesto.montoIGV)]);
  }
  rows.push(["", "", "", "TOTAL GENERAL (S/.)", fmt(presupuesto.totalGeneral)]);
  return rows;
}

// Partida fija de movilización de equipo: va antes de Movimiento de Tierras
// en el Presupuesto Referencial, con cantidad 1 (no editable) — solo existe
// para que el usuario pueda ponerle un precio general (glb), sin depender de
// ningún metrado calculado.
export const MOVILIZACION_PARTIDA = "Movilización y Desmovilización de Equipos y Herramientas";
export const MOVILIZACION_UNIDAD = "glb";
export const MOVILIZACION_LABEL = "Movilización de Equipo";

export function crearLineaMovilizacion(): MetradoLine {
  return { partida: MOVILIZACION_PARTIDA, unidad: MOVILIZACION_UNIDAD, cantidad: 1 };
}

// Partidas que el usuario agrega a mano al Presupuesto Referencial para lo
// que no cubre ningún módulo calculado — van después de Muros de
// Arquitectura, igual que "Metrado de Materiales" ya permite agregar
// materiales sueltos (customMaterialesALineas en materiales.ts).
export interface PresupuestoCustomLine {
  id: string;
  partida: string;
  unidad: string;
  cantidad: number;
}
export const PRESUPUESTO_CUSTOM_LABEL = "Otros / Partidas Adicionales";

export function presupuestoCustomALineas(items: PresupuestoCustomLine[]): MetradoLine[] {
  return items.map((i) => ({ partida: i.partida, unidad: i.unidad, cantidad: i.cantidad }));
}

// Forma mínima que necesitan la tabla en pantalla y los exportadores para
// pintar una sección del Presupuesto Referencial — la cumplen tanto
// PresupuestoModuloGroup (con su "module" de más) como Movilización y Otros
// (que no pertenecen a ningún módulo).
export interface PresupuestoSeccion {
  label: string;
  rows: PresupuestoRow[];
  subtotal: number;
}
