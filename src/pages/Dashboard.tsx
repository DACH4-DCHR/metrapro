import { Fragment, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  Weight,
  Layers3,
  RectangleHorizontal,
  MoveUpRight,
  Square,
  StretchHorizontal,
  Rows3,
  GitCommitHorizontal,
  RectangleVertical,
  PanelLeft,
  BrickWall,
  LayoutPanelTop,
  Grid2x2,
  Shovel,
  Trash2,
  FileDown,
  FileSpreadsheet,
  Upload,
  ImageOff,
  Building2,
  ClipboardList,
  Wallet,
  ListChecks,
  ShoppingCart,
  FileText,
  Plus,
  Send,
  BarChart3,
  Users,
  PaintRoller,
  Paintbrush,
  PaintBucket,
  Grid3x3,
  Home,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { StatCard } from "../components/ui/StatCard";
import { ResultTable } from "../components/ui/ResultTable";
import { HorizontalBarChart } from "../components/charts/HorizontalBarChart";
import {
  costosPorCategoria,
  cantidadesPorModulo,
  manoObraVsMateriales,
  ACABADOS_MODULO_COLOR,
  ESTRUCTURAL_SECCION_POR_MODULO,
  ESTRUCTURAL_SECCIONES_ORDEN,
  ESTRUCTURAL_SECCION_COLOR,
  MOVILIZACION_COLOR,
} from "../lib/dashboardCharts";
import { useProjectStore } from "../store/projectStore";
import {
  calcularPresupuesto,
  agruparPresupuestoPorModulo,
  valorizarLineas,
  crearLineaMovilizacion,
  presupuestoCustomALineas,
  MOVILIZACION_LABEL,
  PRESUPUESTO_CUSTOM_LABEL,
  GG_PCT_KEY,
  UT_PCT_KEY,
  IGV_PCT_KEY,
  GG_ON_KEY,
  UT_ON_KEY,
  IGV_ON_KEY,
  type PresupuestoCustomLine,
  type PresupuestoSeccion,
} from "../lib/presupuesto";
import { consolidateLines } from "../lib/consolidate";
import {
  calcularMetradoMateriales,
  materialesALineas,
  aceroALineas,
  customMaterialesALineas,
  type CustomMaterialLine,
} from "../lib/materiales";
import {
  generateExcelReport,
  downloadExcelWorkbook,
  buildMetradoLineasSheet,
  buildPresupuestoPorModuloSheet,
  buildValorizadoSheet,
} from "../lib/reports/excelReport";
import { agruparAceroPorModulo, LONGITUD_VARILLA_COMERCIAL_M } from "../lib/calc/aceroResumen";
import { MODULE_LABELS } from "../lib/moduleLabels";
import { MODULE_GROUP, type ModuleFamily } from "../lib/moduleGroups";
import type { ModuleType, CalculatedElement } from "../lib/types";

const numberFormatter = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 });
const currencyFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  maximumFractionDigits: 2,
});

const moduleMeta: Record<ModuleType, { label: string; icon: typeof Layers3 }> = {
  losa: { label: MODULE_LABELS.losa, icon: Layers3 },
  viga: { label: MODULE_LABELS.viga, icon: RectangleHorizontal },
  escalera: { label: MODULE_LABELS.escalera, icon: MoveUpRight },
  movimientoTierras: { label: MODULE_LABELS.movimientoTierras, icon: Shovel },
  zapata: { label: MODULE_LABELS.zapata, icon: Square },
  cimientoCorrido: { label: MODULE_LABELS.cimientoCorrido, icon: StretchHorizontal },
  sobrecimiento: { label: MODULE_LABELS.sobrecimiento, icon: Rows3 },
  vigaCimentacion: { label: MODULE_LABELS.vigaCimentacion, icon: GitCommitHorizontal },
  columna: { label: MODULE_LABELS.columna, icon: RectangleVertical },
  placa: { label: MODULE_LABELS.placa, icon: PanelLeft },
  muroAlbanileria: { label: MODULE_LABELS.muroAlbanileria, icon: BrickWall },
  losaMaciza: { label: MODULE_LABELS.losaMaciza, icon: LayoutPanelTop },
  muroArquitectura: { label: MODULE_LABELS.muroArquitectura, icon: Grid2x2 },
  tarrajeoInteriores: { label: MODULE_LABELS.tarrajeoInteriores, icon: PaintRoller },
  tarrajeoExteriores: { label: MODULE_LABELS.tarrajeoExteriores, icon: Home },
  tarrajeoEscalera: { label: MODULE_LABELS.tarrajeoEscalera, icon: Paintbrush },
  pisosPavimentos: { label: MODULE_LABELS.pisosPavimentos, icon: Grid3x3 },
  pintura: { label: MODULE_LABELS.pintura, icon: PaintBucket },
};

const MAX_LOGO_BYTES = 1_000_000;

// La PWA instalada (ícono en el celular) corre en un WebView "standalone" de
// Android que no logra entregarle un archivo a NINGUNA otra app vía Web
// Share — falla con "No se puede compartir, vuelve a intentarlo" en
// WhatsApp, Gmail, etc. por igual (limitación conocida del modo standalone
// de Android, no de esta app). Abrir el mismo sitio en Chrome normal sí
// funciona, así que ahí se evita intentarlo y se descarga directo.
function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  const displayModeStandalone = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return displayModeStandalone || iosStandalone;
}

// scope=undefined muestra el proyecto completo (Dashboard general); con
// scope, solo los elementos de esa familia de módulos (ver moduleGroups.ts)
// — así "Metrados Estructurales" y "Acabados y Adicionales" son vistas
// independientes, sin mezclar datos de una en la otra. Los botones de
// exportar del encabezado (Descargar PDF/Exportar Excel/Enviar) son la
// excepción: siempre traen el proyecto completo, sin importar la vista
// actual, porque son el documento real que se comparte con el cliente.
export function DashboardPage({ scope }: { scope?: ModuleFamily } = {}) {
  const projectInfo = useProjectStore((s) => s.projectInfo);
  const setProjectInfo = useProjectStore((s) => s.setProjectInfo);
  const allElements = useProjectStore((s) => s.elements);
  const elements = useMemo(
    () => (scope ? allElements.filter((e) => MODULE_GROUP[e.module] === scope) : allElements),
    [allElements, scope]
  );
  const removeElement = useProjectStore((s) => s.removeElement);
  const prices = useProjectStore((s) => s.prices);
  const setPrice = useProjectStore((s) => s.setPrice);
  const materialesCustom = useProjectStore((s) => s.materialesCustom);
  const setMaterialesCustomStore = useProjectStore((s) => s.setMaterialesCustom);
  const presupuestoCustom = useProjectStore((s) => s.presupuestoCustom);
  const setPresupuestoCustomStore = useProjectStore((s) => s.setPresupuestoCustom);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);

  const consolidated = useMemo(() => consolidateLines(elements.map((e) => e.lines)), [elements]);

  // Igual que el gráfico de costo por categoría: separa por familia de módulo
  // (ver moduleGroups.ts) para que el Dashboard general no mezcle Metrados
  // Estructurales con Acabados en "Elementos guardados" ni en "Cuadro de
  // Metrados Consolidado". En los dashboards ya filtrados por scope, uno de
  // los dos siempre sale vacío — el filtro no hace nada raro ahí.
  const elementosEstructuralesGuardados = useMemo(
    () => elements.filter((e) => MODULE_GROUP[e.module] === "estructural"),
    [elements]
  );
  const elementosAcabadosGuardados = useMemo(
    () => elements.filter((e) => MODULE_GROUP[e.module] === "acabados"),
    [elements]
  );
  const consolidatedEstructural = useMemo(
    () => consolidateLines(elementosEstructuralesGuardados.map((e) => e.lines)),
    [elementosEstructuralesGuardados]
  );
  const consolidatedAcabadosLines = useMemo(
    () => consolidateLines(elementosAcabadosGuardados.map((e) => e.lines)),
    [elementosAcabadosGuardados]
  );

  const aceroPorModulo = useMemo(() => agruparAceroPorModulo(elements), [elements]);

  const elementosSinDesglose = useMemo(
    () => elements.filter((el) => el.steelKg > 0 && (!el.steelByDiameter || el.steelByDiameter.length === 0)),
    [elements]
  );

  const lineaMovilizacion = useMemo(() => crearLineaMovilizacion(), []);
  const presupuestoCustomLineas = useMemo(
    () => presupuestoCustomALineas(presupuestoCustom),
    [presupuestoCustom]
  );
  const presupuesto = useMemo(
    () => calcularPresupuesto(consolidated, prices, [lineaMovilizacion, ...presupuestoCustomLineas]),
    [consolidated, prices, lineaMovilizacion, presupuestoCustomLineas]
  );
  const presupuestoPorModulo = useMemo(
    () => agruparPresupuestoPorModulo(elements, prices),
    [elements, prices]
  );
  const movilizacionValorizado = useMemo(
    () => valorizarLineas([lineaMovilizacion], prices),
    [lineaMovilizacion, prices]
  );
  const presupuestoCustomValorizado = useMemo(
    () => valorizarLineas(presupuestoCustomLineas, prices),
    [presupuestoCustomLineas, prices]
  );
  const presupuestoSecciones = useMemo<PresupuestoSeccion[]>(
    () => [
      { label: MOVILIZACION_LABEL, rows: movilizacionValorizado.rows, subtotal: movilizacionValorizado.total },
      ...presupuestoPorModulo,
      {
        label: PRESUPUESTO_CUSTOM_LABEL,
        rows: presupuestoCustomValorizado.rows,
        subtotal: presupuestoCustomValorizado.total,
      },
    ],
    [movilizacionValorizado, presupuestoPorModulo, presupuestoCustomValorizado]
  );

  // "Otros" se reparte según el grupo que el usuario elige al agregar cada
  // partida (por defecto "estructural" en líneas guardadas antes de que
  // existiera ese selector) — a diferencia de Movilización, que no tiene
  // dueño y se queda siempre del lado de Metrados Estructurales.
  const presupuestoCustomEstructural = useMemo(
    () => presupuestoCustom.filter((p) => (p.grupo ?? "estructural") === "estructural"),
    [presupuestoCustom]
  );
  const presupuestoCustomAcabados = useMemo(
    () => presupuestoCustom.filter((p) => p.grupo === "acabados"),
    [presupuestoCustom]
  );
  const presupuestoCustomValorizadoEstructural = useMemo(
    () => valorizarLineas(presupuestoCustomALineas(presupuestoCustomEstructural), prices),
    [presupuestoCustomEstructural, prices]
  );
  const presupuestoCustomValorizadoAcabados = useMemo(
    () => valorizarLineas(presupuestoCustomALineas(presupuestoCustomAcabados), prices),
    [presupuestoCustomAcabados, prices]
  );

  const presupuestoSeccionesEstructural = useMemo<PresupuestoSeccion[]>(
    () => [
      { label: MOVILIZACION_LABEL, rows: movilizacionValorizado.rows, subtotal: movilizacionValorizado.total },
      ...presupuestoPorModulo.filter((g) => MODULE_GROUP[g.module] === "estructural"),
      {
        label: PRESUPUESTO_CUSTOM_LABEL,
        rows: presupuestoCustomValorizadoEstructural.rows,
        subtotal: presupuestoCustomValorizadoEstructural.total,
      },
    ],
    [movilizacionValorizado, presupuestoPorModulo, presupuestoCustomValorizadoEstructural]
  );
  const presupuestoSeccionesAcabados = useMemo<PresupuestoSeccion[]>(() => {
    const grupos = presupuestoPorModulo.filter((g) => MODULE_GROUP[g.module] === "acabados");
    if (presupuestoCustomAcabados.length === 0) return grupos;
    return [
      ...grupos,
      {
        label: PRESUPUESTO_CUSTOM_LABEL,
        rows: presupuestoCustomValorizadoAcabados.rows,
        subtotal: presupuestoCustomValorizadoAcabados.total,
      },
    ];
  }, [presupuestoPorModulo, presupuestoCustomAcabados, presupuestoCustomValorizadoAcabados]);
  const subtotalPresupuestoEstructural = useMemo(
    () => presupuestoSeccionesEstructural.reduce((acc, g) => acc + g.subtotal, 0),
    [presupuestoSeccionesEstructural]
  );
  const subtotalPresupuestoAcabados = useMemo(
    () => presupuestoSeccionesAcabados.reduce((acc, g) => acc + g.subtotal, 0),
    [presupuestoSeccionesAcabados]
  );

  const costosCategoria = useMemo(() => costosPorCategoria(presupuesto.rows), [presupuesto.rows]);
  // Solo para el Dashboard general (con todo junto): separa las categorías
  // en los mismos 2 grupos que ya se ven en el menú y en los dashboards
  // independientes, para que "Acabados" no quede mezclado con las categorías
  // estructurales en el mismo gráfico — aunque el dashboard sí junte todo.
  //
  // "Otros" es un caso especial: categorizarPartida() no distingue el grupo
  // que el usuario eligió para cada partida manual (esa info no llega hasta
  // acá, se pierde en el camino a MetradoLine/PresupuestoRow) — por eso se
  // reparte "a mano" usando el subtotal ya calculado de cada lado
  // (presupuestoCustomValorizadoEstructural/Acabados), en vez de mandar todo
  // "Otros" a un solo lado como si nunca se pudiera elegir.
  const otrosCategoriaItem = useMemo(() => costosCategoria.find((c) => c.categoria === "Otros"), [costosCategoria]);
  const otrosAcabadosMonto = presupuestoCustomValorizadoAcabados.total;
  const otrosEstructuralMonto = Math.max((otrosCategoriaItem?.monto ?? 0) - otrosAcabadosMonto, 0);
  // A diferencia de la versión anterior (categorías por tipo de trabajo:
  // concreto, acero, encofrado...), acá se desglosa por SECCIÓN REAL del menú
  // (Movimiento de Tierras, Cimentación, Elementos Verticales,
  // Superestructura, Tabiquería) — el mismo subtotal exacto que ya se ve en
  // el Presupuesto Referencial (presupuestoPorModulo), agrupado por
  // ESTRUCTURAL_SECCION_POR_MODULO. Movilización va siempre primero y Otros
  // siempre al final, igual que en el Presupuesto Referencial.
  const costosEstructurales = useMemo(() => {
    const totalesPorSeccion = new Map<string, number>();
    for (const g of presupuestoPorModulo) {
      const seccion = ESTRUCTURAL_SECCION_POR_MODULO[g.module];
      if (!seccion) continue;
      totalesPorSeccion.set(seccion, (totalesPorSeccion.get(seccion) ?? 0) + g.subtotal);
    }
    const secciones = ESTRUCTURAL_SECCIONES_ORDEN.map((seccion) => {
      const monto = totalesPorSeccion.get(seccion) ?? 0;
      return {
        categoria: seccion as string,
        monto,
        pct: presupuesto.costoDirecto > 0 ? (monto / presupuesto.costoDirecto) * 100 : 0,
        color: ESTRUCTURAL_SECCION_COLOR[seccion],
      };
    }).filter((c) => c.monto > 0);

    const movilizacionMonto = movilizacionValorizado.total;
    const items = [...secciones];
    if (movilizacionMonto > 0) {
      items.unshift({
        categoria: MOVILIZACION_LABEL,
        monto: movilizacionMonto,
        pct: presupuesto.costoDirecto > 0 ? (movilizacionMonto / presupuesto.costoDirecto) * 100 : 0,
        color: MOVILIZACION_COLOR,
      });
    }
    if (otrosEstructuralMonto > 0) {
      items.push({
        categoria: PRESUPUESTO_CUSTOM_LABEL,
        monto: otrosEstructuralMonto,
        pct: presupuesto.costoDirecto > 0 ? (otrosEstructuralMonto / presupuesto.costoDirecto) * 100 : 0,
        color: otrosCategoriaItem?.color ?? "#008300",
      });
    }
    return items;
  }, [presupuestoPorModulo, presupuesto.costoDirecto, movilizacionValorizado, otrosEstructuralMonto, otrosCategoriaItem]);
  // A diferencia de Metrados Estructurales (categorías por tipo de trabajo:
  // concreto, acero...), acá se desglosa por MÓDULO REAL de Acabados y
  // Adicionales (Tarrajeo de Interiores, Exteriores, Escalera, Pisos y
  // Pavimentos, Pintura) — el mismo subtotal exacto que ya se ve en el
  // Presupuesto Referencial (presupuestoPorModulo), no una categorización por
  // texto de partida.
  const costosAcabadosCategoria = useMemo(() => {
    const modulos = presupuestoPorModulo
      .filter((g) => MODULE_GROUP[g.module] === "acabados" && g.subtotal > 0)
      .map((g) => ({
        categoria: g.label,
        monto: g.subtotal,
        pct: presupuesto.costoDirecto > 0 ? (g.subtotal / presupuesto.costoDirecto) * 100 : 0,
        color: ACABADOS_MODULO_COLOR[g.module as keyof typeof ACABADOS_MODULO_COLOR] ?? "#4a3aa7",
      }));
    if (otrosAcabadosMonto <= 0) return modulos;
    return [
      ...modulos,
      {
        categoria: PRESUPUESTO_CUSTOM_LABEL,
        monto: otrosAcabadosMonto,
        pct: presupuesto.costoDirecto > 0 ? (otrosAcabadosMonto / presupuesto.costoDirecto) * 100 : 0,
        color: otrosCategoriaItem?.color ?? "#008300",
      },
    ];
  }, [presupuestoPorModulo, otrosAcabadosMonto, presupuesto.costoDirecto, otrosCategoriaItem]);
  const subtotalCostosEstructurales = useMemo(
    () => costosEstructurales.reduce((acc, c) => acc + c.monto, 0),
    [costosEstructurales]
  );
  const subtotalCostosAcabados = useMemo(
    () => costosAcabadosCategoria.reduce((acc, c) => acc + c.monto, 0),
    [costosAcabadosCategoria]
  );
  const manoObraMateriales = useMemo(() => manoObraVsMateriales(presupuesto.rows), [presupuesto.rows]);
  const cantidadesModulo = useMemo(() => cantidadesPorModulo(elements), [elements]);
  const concretoPorModulo = useMemo(
    () =>
      cantidadesModulo
        .filter((m) => m.concreteM3 > 0)
        .sort((a, b) => b.concreteM3 - a.concreteM3)
        .map((m) => ({ label: m.label, value: m.concreteM3, color: "#2a78d6" })),
    [cantidadesModulo]
  );
  const aceroPorModuloChart = useMemo(
    () =>
      cantidadesModulo
        .filter((m) => m.steelKg > 0)
        .sort((a, b) => b.steelKg - a.steelKg)
        .map((m) => ({ label: m.label, value: m.steelKg, color: "#eb6834" })),
    [cantidadesModulo]
  );
  const encofradoPorModulo = useMemo(
    () =>
      cantidadesModulo
        .filter((m) => m.formworkM2 > 0)
        .sort((a, b) => b.formworkM2 - a.formworkM2)
        .map((m) => ({ label: m.label, value: m.formworkM2, color: "#1baf7a" })),
    [cantidadesModulo]
  );

  const materiales = useMemo(() => calcularMetradoMateriales(consolidated, elements), [consolidated, elements]);
  const materialesLines = useMemo(() => materialesALineas(materiales), [materiales]);
  const customLineas = useMemo(() => customMaterialesALineas(materialesCustom), [materialesCustom]);
  const aceroLineas = useMemo(() => aceroALineas(materiales), [materiales]);

  const derivedValorizado = useMemo(() => valorizarLineas(materialesLines, prices), [materialesLines, prices]);
  const customValorizado = useMemo(() => valorizarLineas(customLineas, prices), [customLineas, prices]);
  const aceroValorizado = useMemo(() => valorizarLineas(aceroLineas, prices), [aceroLineas, prices]);
  const costoTotalMateriales = derivedValorizado.total + customValorizado.total + aceroValorizado.total;

  const materialesExportLines = useMemo(
    () => [...materialesLines, ...customLineas, ...aceroLineas],
    [materialesLines, customLineas, aceroLineas]
  );

  // Solo para los botones de exportar del encabezado (ver comentario junto a
  // "scope" más arriba): el mismo cálculo de arriba, pero sobre TODOS los
  // elementos del proyecto, sin importar en qué dashboard estés parado.
  const consolidatedFull = useMemo(
    () => (scope ? consolidateLines(allElements.map((e) => e.lines)) : consolidated),
    [scope, allElements, consolidated]
  );
  const materialesFull = useMemo(
    () => (scope ? calcularMetradoMateriales(consolidatedFull, allElements) : materiales),
    [scope, consolidatedFull, allElements, materiales]
  );
  const materialesExportLinesFull = useMemo(() => {
    if (!scope) return materialesExportLines;
    return [...materialesALineas(materialesFull), ...customLineas, ...aceroALineas(materialesFull)];
  }, [scope, materialesExportLines, materialesFull, customLineas]);

  const materialesFootRowsExcel = useMemo(() => {
    const rows: (string | number)[][] = materiales.acero.map((r) => [
      `Varillas Ø ${r.symbol} x 9m (habilitación)`,
      "und",
      r.numeroVarillas,
      "",
      "",
    ]);
    rows.push(["", "", "", "Costo total de materiales (S/.)", Number(costoTotalMateriales.toFixed(2))]);
    return rows;
  }, [materiales.acero, costoTotalMateriales]);

  function addCustomMaterial(partida: string, unidad: string, cantidad: number) {
    const item: CustomMaterialLine = { id: crypto.randomUUID(), partida, unidad, cantidad };
    setMaterialesCustomStore([...materialesCustom, item]);
  }
  function removeCustomMaterial(id: string) {
    setMaterialesCustomStore(materialesCustom.filter((m) => m.id !== id));
  }

  function addCustomPresupuestoLine(partida: string, unidad: string, cantidad: number, grupo?: ModuleFamily) {
    const item: PresupuestoCustomLine = { id: crypto.randomUUID(), partida, unidad, cantidad, grupo };
    setPresupuestoCustomStore([...presupuestoCustom, item]);
  }
  function removeCustomPresupuestoLine(id: string) {
    setPresupuestoCustomStore(presupuestoCustom.filter((p) => p.id !== id));
  }

  // Un grupo (Movilización, un módulo puntual, u "Otros") del Presupuesto
  // Referencial: banda con el nombre, sus filas editables, y su subtotal.
  // Reutilizada 2 veces (Metrados Estructurales / Acabados y Adicionales) en
  // vez de duplicar el bloque, para que el Dashboard general no las mezcle.
  function renderPresupuestoGrupo(group: PresupuestoSeccion, customItems: PresupuestoCustomLine[] = presupuestoCustom) {
    const esOtros = group.label === PRESUPUESTO_CUSTOM_LABEL;
    return (
      <Fragment key={group.label}>
        <tr className="bg-amber-500/10">
          <td className="px-4 py-1.5 font-semibold uppercase tracking-wide text-navy-800" colSpan={6}>
            {group.label}
          </td>
        </tr>
        {group.rows.map((row, idx) => (
          <tr key={row.key} className={idx % 2 === 0 ? "bg-white" : "bg-steel-50"}>
            <td className="px-4 py-2 text-navy-900">{row.line.partida}</td>
            <td className="px-4 py-2 text-steel-600">{row.line.unidad}</td>
            <td className="px-4 py-2 text-right font-mono">{numberFormatter.format(row.line.cantidad)}</td>
            <td className="px-4 py-2 text-right">
              <PriceInput value={row.price} onChange={(v) => setPrice(row.key, v)} />
            </td>
            <td className="px-4 py-2 text-right font-mono font-medium text-navy-900">
              {currencyFormatter.format(row.subtotal)}
            </td>
            <td className="px-4 py-2 no-print">
              {esOtros && (
                <button
                  onClick={() => removeCustomPresupuestoLine(customItems[idx].id)}
                  aria-label="Quitar partida"
                  className="rounded p-1 text-steel-500 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </td>
          </tr>
        ))}
        <tr className="bg-steel-100/70 text-xs font-medium text-steel-600">
          <td className="px-4 py-1.5" colSpan={4}>
            Subtotal {group.label} (S/.)
          </td>
          <td className="px-4 py-1.5 text-right font-mono">{currencyFormatter.format(group.subtotal)}</td>
          <td className="no-print" />
        </tr>
      </Fragment>
    );
  }

  const safeProjectName = (projectInfo.nombreObra || "proyecto").replace(/[\\/:*?"<>|]/g, "_");

  function setGGOn(on: boolean) {
    setPrice(GG_ON_KEY, on ? 1 : 0);
  }
  function setUTOn(on: boolean) {
    setPrice(UT_ON_KEY, on ? 1 : 0);
  }
  function setIGVOn(on: boolean) {
    setPrice(IGV_ON_KEY, on ? 1 : 0);
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      alert("El logo es muy pesado. Usa una imagen menor a 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProjectInfo({ logoDataUrl: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleDownloadPdf() {
    setGeneratingPdf(true);
    try {
      const { generatePdfReport } = await import("../lib/reports/pdfReport");
      generatePdfReport(
        projectInfo,
        allElements,
        consolidatedFull,
        prices,
        materialesExportLinesFull,
        materialesFull.totalVarillas,
        presupuestoCustom
      );
    } finally {
      setGeneratingPdf(false);
    }
  }

  // Usa el panel nativo de compartir del sistema operativo (navigator.share),
  // que deja elegir WhatsApp, Telegram, correo o cualquier otra app instalada
  // — no es específico de WhatsApp, por eso el botón dice "Enviar".
  async function handleSharePdf() {
    setSharingPdf(true);
    try {
      if (isStandaloneApp()) {
        const { generatePdfReport } = await import("../lib/reports/pdfReport");
        generatePdfReport(
          projectInfo,
          allElements,
          consolidatedFull,
          prices,
          materialesExportLinesFull,
          materialesFull.totalVarillas,
          presupuestoCustom
        );
        alert(
          "La app instalada no puede compartir archivos directamente (una limitación de Android). Se descargó el PDF: ábrelo desde tus Descargas y compártelo manualmente, o entra a metrapro.vercel.app desde Chrome (sin usar el ícono instalado) para enviarlo en un solo paso."
        );
        return;
      }

      const { sharePdfReport } = await import("../lib/reports/pdfReport");
      const shared = await sharePdfReport(
        projectInfo,
        allElements,
        consolidatedFull,
        prices,
        materialesExportLinesFull,
        materialesFull.totalVarillas,
        presupuestoCustom
      );
      if (!shared) {
        alert(
          'Tu navegador no permite compartir archivos directamente. Usa el botón "Descargar PDF" y adjúntalo manualmente donde quieras enviarlo.'
        );
      }
    } catch {
      alert("No se pudo enviar el PDF. Intenta descargarlo con el botón de al lado.");
    } finally {
      setSharingPdf(false);
    }
  }

  const headerTitle =
    scope === "estructural"
      ? "Dashboard de Metrados Estructurales"
      : scope === "acabados"
        ? "Dashboard de Acabados y Adicionales"
        : "Dashboard del Proyecto";
  const headerSubtitle =
    scope === "estructural"
      ? "Solo zapatas, columnas, vigas, losas y demás metrados estructurales de este proyecto"
      : scope === "acabados"
        ? "Solo acabados y otros metrados no estructurales de este proyecto"
        : "Resumen general de metrados calculados";

  return (
    <div>
      <PageHeader
        title={headerTitle}
        subtitle={headerSubtitle}
        icon={<LayoutDashboard size={20} />}
        helpKey="dashboard"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                generateExcelReport(
                  projectInfo,
                  allElements,
                  consolidatedFull,
                  prices,
                  materialesExportLinesFull,
                  materialesFull.totalVarillas,
                  presupuestoCustom
                )
              }
              disabled={consolidatedFull.length === 0}
              className="flex items-center gap-2 rounded-md border border-steel-300 bg-white px-4 py-2 text-sm font-semibold text-navy-800 transition-colors hover:bg-steel-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet size={16} />
              Exportar Excel
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={consolidatedFull.length === 0 || generatingPdf}
              className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-navy-950 shadow-sm transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileDown size={16} />
              {generatingPdf ? "Generando..." : "Descargar PDF"}
            </button>
            <button
              onClick={handleSharePdf}
              disabled={consolidatedFull.length === 0 || sharingPdf}
              className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={16} />
              {sharingPdf ? "Preparando..." : "Enviar"}
            </button>
          </div>
        }
      />

      <div className="flex flex-col gap-6 p-6">
        <SectionCard title="Datos del proyecto" icon={<Building2 size={16} className="text-navy-700" />}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-steel-300 bg-steel-50">
                {projectInfo.logoDataUrl ? (
                  <img src={projectInfo.logoDataUrl} alt="Logo de la empresa" className="h-full w-full object-contain" />
                ) : (
                  <ImageOff size={22} className="text-steel-400" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-md border border-steel-300 bg-white px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-steel-100"
                >
                  <Upload size={14} />
                  {projectInfo.logoDataUrl ? "Cambiar logo" : "Subir logo de la empresa"}
                </button>
                <span className="text-xs text-steel-500">Aparecerá en el reporte PDF. Máx. 1 MB.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Field label="Nombre de obra" value={projectInfo.nombreObra} onChange={(v) => setProjectInfo({ nombreObra: v })} />
              <Field label="Cliente" value={projectInfo.cliente} onChange={(v) => setProjectInfo({ cliente: v })} />
              <Field label="Ubicación" value={projectInfo.ubicacion} onChange={(v) => setProjectInfo({ ubicacion: v })} />
              <Field label="Responsable" value={projectInfo.responsable} onChange={(v) => setProjectInfo({ responsable: v })} />
              <Field
                label="Fecha"
                value={projectInfo.fecha}
                type="date"
                onChange={(v) => setProjectInfo({ fecha: v })}
              />
            </div>
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <StatCard
            label="Mano de obra"
            value={currencyFormatter.format(manoObraMateriales.manoObra)}
            subLabel={`${manoObraMateriales.pctManoObra.toFixed(1)}%`}
            icon={<Users size={26} />}
            accentColor="#2a78d6"
          />
          <StatCard
            label="Materiales"
            value={currencyFormatter.format(manoObraMateriales.materiales)}
            subLabel={`${manoObraMateriales.pctMateriales.toFixed(1)}%`}
            icon={<BrickWall size={26} />}
            accentColor="#eb6834"
          />
          <StatCard
            label="Presupuesto general"
            value={currencyFormatter.format(presupuesto.costoDirecto)}
            subLabel="Mano de obra + materiales"
            subLabelColor="#8695a3"
            icon={<Wallet size={26} />}
            accentColor="#d98c2b"
          />
        </div>

        {(costosCategoria.length > 0 || cantidadesModulo.length > 0) && (
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <SectionCard title="Costo directo por categoría" icon={<BarChart3 size={16} className="text-navy-700" />}>
              <p className="mb-3 text-xs text-steel-500">
                Reparto del costo directo del presupuesto (sin Gastos Generales, Utilidad ni IGV) por sección real de
                obra, igual que en el menú y el Presupuesto Referencial.
              </p>
              {costosEstructurales.length > 0 && (
                <div className={costosAcabadosCategoria.length > 0 ? "mb-5" : ""}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">Metrados Estructurales</p>
                    <span className="font-mono text-xs font-semibold text-steel-500">
                      {currencyFormatter.format(subtotalCostosEstructurales)}
                    </span>
                  </div>
                  <HorizontalBarChart
                    items={costosEstructurales.map((c) => ({
                      label: c.categoria,
                      value: c.monto,
                      color: c.color,
                      subLabel: `${c.pct.toFixed(1)}%`,
                    }))}
                    valueFormatter={(v) => currencyFormatter.format(v)}
                  />
                </div>
              )}

              {costosAcabadosCategoria.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">Acabados y Adicionales</p>
                    <span className="font-mono text-xs font-semibold text-steel-500">
                      {currencyFormatter.format(subtotalCostosAcabados)}
                    </span>
                  </div>
                  <HorizontalBarChart
                    items={costosAcabadosCategoria.map((c) => ({
                      label: c.categoria,
                      value: c.monto,
                      color: c.color,
                      subLabel: `${c.pct.toFixed(1)}%`,
                    }))}
                    valueFormatter={(v) => currencyFormatter.format(v)}
                  />
                </div>
              )}

              <div className="mt-4 rounded-lg border border-steel-200 bg-steel-50 p-3 text-sm">
                <div className="flex items-center justify-between py-1">
                  <span className="text-steel-600">Costo directo (S/.)</span>
                  <span className="font-mono font-medium text-navy-900">
                    {currencyFormatter.format(presupuesto.costoDirecto)}
                  </span>
                </div>
                {presupuesto.ggOn && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-steel-600">Gastos Generales ({presupuesto.ggPct}%)</span>
                    <span className="font-mono text-navy-900">{currencyFormatter.format(presupuesto.montoGG)}</span>
                  </div>
                )}
                {presupuesto.utOn && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-steel-600">Utilidad ({presupuesto.utPct}%)</span>
                    <span className="font-mono text-navy-900">{currencyFormatter.format(presupuesto.montoUT)}</span>
                  </div>
                )}
                {presupuesto.igvOn && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-steel-600">IGV ({presupuesto.igvPct}%)</span>
                    <span className="font-mono text-navy-900">{currencyFormatter.format(presupuesto.montoIGV)}</span>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between rounded-md bg-navy-900 px-3 py-2 text-base font-bold text-white">
                  <span>Total general (S/.)</span>
                  <span className="font-mono">{currencyFormatter.format(presupuesto.totalGeneral)}</span>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Metrados por módulo" icon={<BarChart3 size={16} className="text-navy-700" />} collapsible>
              <p className="mb-3 text-xs text-steel-500">
                Concreto, acero y encofrado por módulo — cada magnitud en su propia escala, ya que no se pueden
                comparar entre sí.
              </p>
              <div className="flex flex-col gap-5">
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-steel-500">
                    Concreto (m³)
                  </p>
                  <HorizontalBarChart
                    items={concretoPorModulo}
                    valueFormatter={(v) => `${numberFormatter.format(v)} m³`}
                    emptyMessage="Sin concreto calculado todavía."
                  />
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-steel-500">Acero (kg)</p>
                  <HorizontalBarChart
                    items={aceroPorModuloChart}
                    valueFormatter={(v) => `${numberFormatter.format(v)} kg`}
                    emptyMessage="Sin acero calculado todavía."
                  />
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-steel-500">
                    Encofrado (m²)
                  </p>
                  <HorizontalBarChart
                    items={encofradoPorModulo}
                    valueFormatter={(v) => `${numberFormatter.format(v)} m²`}
                    emptyMessage="Sin encofrado calculado todavía."
                  />
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        <SectionCard title="Elementos guardados" icon={<ListChecks size={16} className="text-navy-700" />} collapsible>
          {elements.length === 0 ? (
            <p className="py-6 text-center text-sm text-steel-500">
              {scope === "acabados"
                ? 'Aún no has guardado ningún elemento de Acabados. Ve al módulo de Tarrajeo y Pintura, calcula y presiona "Agregar a la lista".'
                : scope === "estructural"
                  ? 'Aún no has guardado ningún elemento estructural. Ve a un módulo (Losa Aligerada, Vigas o Escaleras), calcula y presiona "Agregar a la lista".'
                  : 'Aún no has guardado ningún elemento. Ve a un módulo (Losa Aligerada, Vigas o Escaleras), calcula y presiona "Agregar a la lista".'}
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {elementosEstructuralesGuardados.length > 0 && (
                <div>
                  {elementosAcabadosGuardados.length > 0 && (
                    <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-amber-600">
                      Metrados Estructurales
                    </p>
                  )}
                  <ElementosGuardadosTable items={elementosEstructuralesGuardados} onRemove={removeElement} />
                </div>
              )}
              {elementosAcabadosGuardados.length > 0 && (
                <div>
                  {elementosEstructuralesGuardados.length > 0 && (
                    <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-amber-600">
                      Acabados y Adicionales
                    </p>
                  )}
                  <ElementosGuardadosTable items={elementosAcabadosGuardados} onRemove={removeElement} />
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {consolidated.length > 0 && (
          <SectionCard
            title="Cuadro de metrados consolidado"
            icon={<ClipboardList size={16} className="text-navy-700" />}
            collapsible
            headerActions={
              <ExportSectionButtons
                onExcel={() =>
                  downloadExcelWorkbook(`metrados_${safeProjectName}`, [
                    buildMetradoLineasSheet("Metrados Consolidado", consolidated),
                  ])
                }
                onPdf={async () => {
                  const { downloadMetradoLineasPdf } = await import("../lib/reports/pdfReport");
                  downloadMetradoLineasPdf(`metrados_${safeProjectName}`, "Cuadro de Metrados Consolidado", consolidated);
                }}
              />
            }
          >
            <div className="flex flex-col gap-5">
              {consolidatedEstructural.length > 0 && (
                <div>
                  {consolidatedAcabadosLines.length > 0 && (
                    <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-amber-600">
                      Metrados Estructurales
                    </p>
                  )}
                  <ResultTable lines={consolidatedEstructural} />
                </div>
              )}
              {consolidatedAcabadosLines.length > 0 && (
                <div>
                  {consolidatedEstructural.length > 0 && (
                    <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-amber-600">
                      Acabados y Adicionales
                    </p>
                  )}
                  <ResultTable lines={consolidatedAcabadosLines} />
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {(aceroPorModulo.length > 0 || elementosSinDesglose.length > 0) && (
          <SectionCard
            title="Acero de refuerzo por diámetro y elemento"
            icon={<Weight size={16} className="text-navy-700" />}
            collapsible
          >
            <div className="mb-3 text-xs text-steel-500">
              Habilitación de acero agrupada por diámetro dentro de cada tipo de elemento (vigas, columnas, losas,
              etc.), en varillas comerciales de {LONGITUD_VARILLA_COMERCIAL_M} m.
            </div>
            {elementosSinDesglose.length > 0 && (
              <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {elementosSinDesglose.length === 1 ? (
                  <>
                    El elemento <strong>{elementosSinDesglose[0].name}</strong> fue calculado antes de esta función y
                    no tiene desglose por diámetro.
                  </>
                ) : (
                  <>
                    {elementosSinDesglose.length} elementos ({elementosSinDesglose.map((e) => e.name).join(", ")})
                    fueron calculados antes de esta función y no tienen desglose por diámetro.
                  </>
                )}{" "}
                Vuelve a calcularlos y presiona "Agregar a la lista" de nuevo para incluirlos aquí.
              </div>
            )}
            <div className="flex flex-col gap-5">
              {aceroPorModulo.map(({ module, resumen }) => {
                const Meta = moduleMeta[module];
                const subtotalKg = resumen.reduce((acc, r) => acc + r.pesoKg, 0);
                const subtotalVarillas = resumen.reduce((acc, r) => acc + r.numeroVarillas, 0);
                return (
                  <div key={module}>
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-navy-900">
                      <Meta.icon size={16} className="text-navy-700" />
                      {Meta.label}
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-steel-200">
                      <table className="w-full min-w-[420px] border-collapse text-sm">
                        <thead>
                          <tr className="bg-navy-900 text-left text-white">
                            <th className="px-4 py-2 font-semibold">Diámetro</th>
                            <th className="px-4 py-2 text-right font-semibold">Peso (kg)</th>
                            <th className="px-4 py-2 text-right font-semibold">
                              Varillas x {LONGITUD_VARILLA_COMERCIAL_M}m (und)
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {resumen.map((r, idx) => (
                            <tr key={r.diametroId} className={idx % 2 === 0 ? "bg-white" : "bg-steel-50"}>
                              <td className="px-4 py-2 text-navy-900">
                                Ø {r.symbol} <span className="text-xs text-steel-500">({r.weightKgPerM.toFixed(3)} kg/m)</span>
                              </td>
                              <td className="px-4 py-2 text-right font-mono text-navy-900">{numberFormatter.format(r.pesoKg)}</td>
                              <td className="px-4 py-2 text-right font-mono text-navy-900">{r.numeroVarillas}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-navy-900 bg-steel-100 font-semibold text-navy-900">
                            <td className="px-4 py-2">Subtotal {Meta.label}</td>
                            <td className="px-4 py-2 text-right font-mono">{numberFormatter.format(subtotalKg)}</td>
                            <td className="px-4 py-2 text-right font-mono">{subtotalVarillas}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        <SectionCard
          title="Presupuesto referencial"
          icon={<Wallet size={16} className="text-navy-700" />}
          collapsible
          headerActions={
            <ExportSectionButtons
              onExcel={() =>
                downloadExcelWorkbook(`presupuesto_${safeProjectName}`, [
                  buildPresupuestoPorModuloSheet(presupuestoSecciones, presupuesto),
                ])
              }
              onPdf={async () => {
                const { downloadPresupuestoPorModuloPdf } = await import("../lib/reports/pdfReport");
                downloadPresupuestoPorModuloPdf(
                  `presupuesto_${safeProjectName}`,
                  "Presupuesto Referencial",
                  presupuestoSecciones,
                  presupuesto
                );
              }}
            />
          }
        >
          <div className="mb-3 text-xs text-steel-500">
            Precios editables (S/.) — se usan valores referenciales por defecto según unidad, ajústalos según tu
            zona y proveedor.
          </div>
          <div className="overflow-x-auto rounded-lg border border-steel-200">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="bg-navy-900 text-left text-white">
                  <th className="px-4 py-2 font-semibold">Partida</th>
                  <th className="px-4 py-2 font-semibold">Unidad</th>
                  <th className="px-4 py-2 text-right font-semibold">Cantidad</th>
                  <th className="px-4 py-2 text-right font-semibold">P. Unit. (S/.)</th>
                  <th className="px-4 py-2 text-right font-semibold">Parcial</th>
                  <th className="px-4 py-2 no-print" />
                </tr>
              </thead>
              <tbody>
                {presupuestoSeccionesAcabados.length > 0 && (
                  <tr className="bg-navy-900">
                    <td className="px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-amber-400" colSpan={4}>
                      Metrados Estructurales
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs font-bold text-white">
                      {currencyFormatter.format(subtotalPresupuestoEstructural)}
                    </td>
                    <td className="no-print" />
                  </tr>
                )}
                {presupuestoSeccionesEstructural.map((g) => renderPresupuestoGrupo(g, presupuestoCustomEstructural))}

                {presupuestoSeccionesAcabados.length > 0 && (
                  <>
                    <tr className="bg-navy-900">
                      <td className="px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-amber-400" colSpan={4}>
                        Acabados y Adicionales
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs font-bold text-white">
                        {currencyFormatter.format(subtotalPresupuestoAcabados)}
                      </td>
                      <td className="no-print" />
                    </tr>
                    {presupuestoSeccionesAcabados.map((g) => renderPresupuestoGrupo(g, presupuestoCustomAcabados))}
                  </>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-navy-900 bg-steel-100 font-semibold text-navy-900">
                  <td className="px-4 py-2" colSpan={4}>
                    Costo directo (S/.)
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{currencyFormatter.format(presupuesto.costoDirecto)}</td>
                  <td className="no-print" />
                </tr>
              </tfoot>
            </table>
          </div>

          <AddCustomLineForm
            itemLabel="Partida"
            placeholder="Ej. Movilización de personal, cerco perimétrico, etc."
            buttonLabel="Agregar partida"
            onAdd={addCustomPresupuestoLine}
            showGroupSelector
          />

          <div className="mt-4 flex flex-col gap-2 border-t border-steel-200 pt-4">
              <BudgetLineRow
                label="Gastos Generales"
                checked={presupuesto.ggOn}
                onCheckedChange={setGGOn}
                pct={presupuesto.ggPct}
                onPctChange={(v) => setPrice(GG_PCT_KEY, v)}
                monto={presupuesto.montoGG}
                currencyFormatter={currencyFormatter}
              />
              <BudgetLineRow
                label="Utilidad"
                checked={presupuesto.utOn}
                onCheckedChange={setUTOn}
                pct={presupuesto.utPct}
                onPctChange={(v) => setPrice(UT_PCT_KEY, v)}
                monto={presupuesto.montoUT}
                currencyFormatter={currencyFormatter}
              />
              <BudgetLineRow
                label="IGV"
                checked={presupuesto.igvOn}
                onCheckedChange={setIGVOn}
                pct={presupuesto.igvPct}
                onPctChange={(v) => setPrice(IGV_PCT_KEY, v)}
                monto={presupuesto.montoIGV}
                currencyFormatter={currencyFormatter}
              />
              <div className="mt-2 flex items-center justify-between border-t-2 border-navy-900 pt-3 text-base font-bold text-navy-900">
                <span>Total general (S/.)</span>
                <span className="font-mono">{currencyFormatter.format(presupuesto.totalGeneral)}</span>
              </div>
            </div>
        </SectionCard>

        {materialesLines.length > 0 && (
          <SectionCard
            title="Metrado de materiales"
            icon={<ShoppingCart size={16} className="text-navy-700" />}
            collapsible
            headerActions={
              <ExportSectionButtons
                onExcel={() =>
                  downloadExcelWorkbook(`materiales_${safeProjectName}`, [
                    buildValorizadoSheet(
                      "Metrado de Materiales",
                      [...derivedValorizado.rows, ...customValorizado.rows, ...aceroValorizado.rows],
                      materialesFootRowsExcel
                    ),
                  ])
                }
                onPdf={async () => {
                  const { downloadValorizadoPdf } = await import("../lib/reports/pdfReport");
                  const footRows: (string | number)[][] = materiales.acero.map((r) => [
                    `Varillas Ø ${r.symbol} x 9m (habilitación)`,
                    "und",
                    String(r.numeroVarillas),
                    "",
                    "",
                  ]);
                  footRows.push(["", "", "", "Costo total de materiales (S/.)", currencyFormatter.format(costoTotalMateriales)]);
                  downloadValorizadoPdf(
                    `materiales_${safeProjectName}`,
                    "Metrado de Materiales",
                    [...derivedValorizado.rows, ...customValorizado.rows, ...aceroValorizado.rows],
                    footRows
                  );
                }}
              />
            }
          >
            <div className="mb-3 text-xs text-steel-500">
              Lista de materiales a comprar, lista para enviar al cliente. El cemento, arena, piedra y agua se
              calculan a partir del concreto usando una dosificación referencial por f'c — ajústala si tu diseño de
              mezcla real difiere. Los precios se toman de los mismos que editas en el Presupuesto Referencial (o el
              valor por defecto según unidad); también puedes ajustarlos aquí directamente.
            </div>
            {materiales.fcNoReconocidos.length > 0 && (
              <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                No se reconoce una dosificación referencial para f'c={materiales.fcNoReconocidos.join(", ")} kg/cm²;
                esas partidas de concreto no están incluidas en el cemento/arena/piedra/agua de esta lista.
              </div>
            )}
            <div className="overflow-x-auto rounded-lg border border-steel-200">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="bg-navy-900 text-left text-white">
                    <th className="px-4 py-2 font-semibold">Material</th>
                    <th className="px-4 py-2 font-semibold">Unidad</th>
                    <th className="px-4 py-2 text-right font-semibold">Cantidad</th>
                    <th className="px-4 py-2 text-right font-semibold">P. Unit. (S/.)</th>
                    <th className="px-4 py-2 text-right font-semibold">Parcial</th>
                    <th className="px-4 py-2 no-print" />
                  </tr>
                </thead>
                <tbody>
                  {derivedValorizado.rows.map((row, idx) => (
                    <tr key={row.key} className={idx % 2 === 0 ? "bg-white" : "bg-steel-50"}>
                      <td className="px-4 py-2 text-navy-900">{row.line.partida}</td>
                      <td className="px-4 py-2 text-steel-600">{row.line.unidad}</td>
                      <td className="px-4 py-2 text-right font-mono">{numberFormatter.format(row.line.cantidad)}</td>
                      <td className="px-4 py-2 text-right">
                        <PriceInput value={row.price} onChange={(v) => setPrice(row.key, v)} />
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-medium text-navy-900">
                        {currencyFormatter.format(row.subtotal)}
                      </td>
                      <td className="px-4 py-2 no-print" />
                    </tr>
                  ))}
                  {customValorizado.rows.map((row, idx) => (
                    <tr
                      key={row.key}
                      className={(derivedValorizado.rows.length + idx) % 2 === 0 ? "bg-white" : "bg-steel-50"}
                    >
                      <td className="px-4 py-2 text-navy-900">{row.line.partida}</td>
                      <td className="px-4 py-2 text-steel-600">{row.line.unidad}</td>
                      <td className="px-4 py-2 text-right font-mono">{numberFormatter.format(row.line.cantidad)}</td>
                      <td className="px-4 py-2 text-right">
                        <PriceInput value={row.price} onChange={(v) => setPrice(row.key, v)} />
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-medium text-navy-900">
                        {currencyFormatter.format(row.subtotal)}
                      </td>
                      <td className="px-4 py-2 no-print">
                        <button
                          onClick={() => removeCustomMaterial(materialesCustom[idx].id)}
                          aria-label="Quitar material"
                          className="rounded p-1 text-steel-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-navy-900 bg-steel-100 font-semibold text-navy-900">
                    <td className="px-4 py-2" colSpan={4}>
                      Subtotal materiales (S/.)
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {currencyFormatter.format(derivedValorizado.total + customValorizado.total)}
                    </td>
                    <td className="no-print" />
                  </tr>
                </tfoot>
              </table>
            </div>

            <AddCustomLineForm
              itemLabel="Material"
              placeholder='Ej. Clavos de 3"'
              buttonLabel="Agregar material"
              onAdd={addCustomMaterial}
            />

            {aceroValorizado.rows.length > 0 && (
              <div className="mt-5">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-900">
                  Acero de refuerzo por diámetro
                </h4>
                <div className="overflow-x-auto rounded-lg border border-steel-200">
                  <table className="w-full min-w-[560px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-navy-900 text-left text-white">
                        <th className="px-4 py-2 font-semibold">Diámetro</th>
                        <th className="px-4 py-2 text-right font-semibold">Peso (kg)</th>
                        <th className="px-4 py-2 text-right font-semibold">
                          Varillas x {LONGITUD_VARILLA_COMERCIAL_M}m (und)
                        </th>
                        <th className="px-4 py-2 text-right font-semibold">P. Unit. (S/. x kg)</th>
                        <th className="px-4 py-2 text-right font-semibold">Parcial</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aceroValorizado.rows.map((row, idx) => {
                        const r = materiales.acero[idx];
                        return (
                          <tr key={row.key} className={idx % 2 === 0 ? "bg-white" : "bg-steel-50"}>
                            <td className="px-4 py-2 text-navy-900">Ø {r.symbol}</td>
                            <td className="px-4 py-2 text-right font-mono">{numberFormatter.format(row.line.cantidad)}</td>
                            <td className="px-4 py-2 text-right font-mono">{r.numeroVarillas}</td>
                            <td className="px-4 py-2 text-right">
                              <PriceInput value={row.price} onChange={(v) => setPrice(row.key, v)} />
                            </td>
                            <td className="px-4 py-2 text-right font-mono font-medium text-navy-900">
                              {currencyFormatter.format(row.subtotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-navy-900 bg-steel-100 font-semibold text-navy-900">
                        <td className="px-4 py-2">
                          Subtotal acero — {materiales.totalVarillas} varilla{materiales.totalVarillas === 1 ? "" : "s"} en total
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {numberFormatter.format(materiales.acero.reduce((a, r) => a + r.pesoKg, 0))}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">{materiales.totalVarillas}</td>
                        <td />
                        <td className="px-4 py-2 text-right font-mono">{currencyFormatter.format(aceroValorizado.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t-2 border-navy-900 pt-3 text-base font-bold text-navy-900">
              <span>Costo total de materiales (S/.)</span>
              <span className="font-mono">{currencyFormatter.format(costoTotalMateriales)}</span>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

// Tabla de "Elementos guardados" para un grupo (Metrados Estructurales o
// Acabados y Adicionales) — la misma tabla de siempre, factorizada para no
// duplicarla cuando el Dashboard general las muestra por separado.
function ElementosGuardadosTable({
  items,
  onRemove,
}: {
  items: CalculatedElement[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-steel-200 text-left text-steel-500">
            <th className="py-2 pr-4 font-medium">Elemento</th>
            <th className="py-2 pr-4 font-medium">Módulo</th>
            <th className="py-2 pr-4 text-right font-medium">Concreto (m³)</th>
            <th className="py-2 pr-4 text-right font-medium">Acero (kg)</th>
            <th className="py-2 pr-4 text-right font-medium">Encofrado (m²)</th>
            <th className="py-2 pr-4 text-right font-medium no-print">Acción</th>
          </tr>
        </thead>
        <tbody>
          {items.map((el) => {
            const Meta = moduleMeta[el.module];
            return (
              <tr key={el.id} className="border-b border-steel-100">
                <td className="py-2 pr-4 font-medium text-navy-900">{el.name}</td>
                <td className="py-2 pr-4 text-steel-600">
                  <span className="flex items-center gap-1.5">
                    <Meta.icon size={14} />
                    {Meta.label}
                  </span>
                </td>
                <td className="py-2 pr-4 text-right font-mono">{numberFormatter.format(el.concreteM3)}</td>
                <td className="py-2 pr-4 text-right font-mono">{numberFormatter.format(el.steelKg)}</td>
                <td className="py-2 pr-4 text-right font-mono">{numberFormatter.format(el.formworkM2)}</td>
                <td className="py-2 pr-4 text-right no-print">
                  <button
                    onClick={() => onRemove(el.id)}
                    className="rounded p-1.5 text-steel-500 hover:bg-red-50 hover:text-red-600"
                    aria-label="Eliminar elemento"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Par de íconos pequeños y discretos en el encabezado de una SectionCard para
// exportar solo esa tabla, sin tener que descargar el reporte completo. Colores
// distintos al fondo ámbar del encabezado y entre sí (verde Excel / rojo PDF),
// siguiendo la convención de esos formatos.
function ExportSectionButtons({ onExcel, onPdf }: { onExcel: () => void; onPdf: () => void | Promise<void> }) {
  const [generating, setGenerating] = useState(false);

  async function handlePdf() {
    setGenerating(true);
    try {
      await onPdf();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={onExcel}
        aria-label="Exportar esta sección a Excel"
        title="Exportar esta sección a Excel"
        className="rounded p-1 text-green-600 hover:bg-green-50"
      >
        <FileSpreadsheet size={15} />
      </button>
      <button
        onClick={handlePdf}
        disabled={generating}
        aria-label="Exportar esta sección a PDF"
        title="Exportar esta sección a PDF"
        className="rounded p-1 text-red-600 hover:bg-red-50 disabled:cursor-wait disabled:opacity-50"
      >
        <FileText size={15} />
      </button>
    </div>
  );
}

// Precio unitario con prefijo "S/" y 2 decimales siempre visibles. Un <input
// type="number"> nativo no puede mostrar el cero final (4.8 y 4.80 son el mismo
// número para el navegador), así que mientras el campo tiene foco se edita como
// texto libre, y al salir se formatea a 2 decimales y recién ahí se guarda.
function PriceInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(value.toFixed(2));

  return (
    <div className="ml-auto flex w-28 items-center gap-1 rounded border border-steel-200 bg-white px-2 py-1 focus-within:border-navy-600 focus-within:ring-2 focus-within:ring-navy-600/20">
      <span className="text-xs text-steel-500">S/</span>
      <input
        type="text"
        inputMode="decimal"
        value={focused ? text : value.toFixed(2)}
        onFocus={() => {
          setText(value.toFixed(2));
          setFocused(true);
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const parsed = Math.max(parseFloat(text.replace(",", ".")) || 0, 0);
          setFocused(false);
          onChange(parsed);
        }}
        className="w-full min-w-0 flex-1 bg-transparent text-right font-mono text-navy-900 outline-none"
      />
    </div>
  );
}

// Formulario genérico para agregar una línea que no viene del metrado
// automático — lo usan tanto Metrado de Materiales (clavos, alambre, madera,
// etc., para completar la lista de compra) como Presupuesto Referencial
// (partidas que ningún módulo cubre, como movilización de personal o cerco
// perimétrico).
function AddCustomLineForm({
  itemLabel,
  placeholder,
  buttonLabel,
  onAdd,
  showGroupSelector = false,
}: {
  itemLabel: string;
  placeholder: string;
  buttonLabel: string;
  onAdd: (partida: string, unidad: string, cantidad: number, grupo?: ModuleFamily) => void;
  // Solo el "Agregar partida" del Presupuesto Referencial lo necesita — ahí
  // sí importa si la partida es de Metrados Estructurales o de Acabados,
  // porque el Dashboard general las muestra por separado. "Agregar
  // material" (Metrado de Materiales) no lo usa: esa sección es siempre de
  // Metrados Estructurales (Acabados no genera cemento/arena/acero).
  showGroupSelector?: boolean;
}) {
  const [partida, setPartida] = useState("");
  const [unidad, setUnidad] = useState("und");
  const [cantidad, setCantidad] = useState(1);
  const [grupo, setGrupo] = useState<ModuleFamily>("estructural");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partida.trim() || cantidad <= 0) return;
    onAdd(partida.trim(), unidad.trim() || "und", cantidad, showGroupSelector ? grupo : undefined);
    setPartida("");
    setUnidad("und");
    setCantidad(1);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-dashed border-steel-300 p-3">
      <div className="min-w-[160px] flex-1">
        <label className="mb-1 block text-xs font-medium text-navy-800">{itemLabel}</label>
        <input
          type="text"
          value={partida}
          onChange={(e) => setPartida(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-steel-200 px-2 py-1.5 text-sm text-navy-900 outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20"
        />
      </div>
      <div className="w-24">
        <label className="mb-1 block text-xs font-medium text-navy-800">Unidad</label>
        <input
          type="text"
          value={unidad}
          onChange={(e) => setUnidad(e.target.value)}
          className="w-full rounded-md border border-steel-200 px-2 py-1.5 text-sm text-navy-900 outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20"
        />
      </div>
      <div className="w-24">
        <label className="mb-1 block text-xs font-medium text-navy-800">Cantidad</label>
        <input
          type="number"
          step="0.01"
          min={0}
          value={cantidad}
          onChange={(e) => setCantidad(Number(e.target.value) || 0)}
          className="w-full rounded-md border border-steel-200 px-2 py-1.5 text-sm text-navy-900 outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20"
        />
      </div>
      {showGroupSelector && (
        <div className="w-44">
          <label className="mb-1 block text-xs font-medium text-navy-800">Grupo</label>
          <select
            value={grupo}
            onChange={(e) => setGrupo(e.target.value as ModuleFamily)}
            className="w-full rounded-md border border-steel-200 bg-white px-2 py-1.5 text-sm text-navy-900 outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20"
          >
            <option value="estructural">Metrados Estructurales</option>
            <option value="acabados">Acabados y Adicionales</option>
          </select>
        </div>
      )}
      <button
        type="submit"
        className="flex items-center gap-1.5 rounded-md bg-navy-900 px-3 py-2 text-xs font-semibold text-white hover:bg-navy-700"
      >
        <Plus size={14} />
        {buttonLabel}
      </button>
    </form>
  );
}

// Fila de Gastos Generales / Utilidad / IGV del presupuesto: checkbox para
// incluirla o dejarla de lado, porcentaje editable, y el monto resultante.
function BudgetLineRow({
  label,
  checked,
  onCheckedChange,
  pct,
  onPctChange,
  monto,
  currencyFormatter,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  pct: number;
  onPctChange: (pct: number) => void;
  monto: number;
  currencyFormatter: Intl.NumberFormat;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="flex items-center gap-2 text-sm text-navy-800">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-600"
        />
        {label}
      </label>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="0.1"
            min={0}
            value={pct}
            disabled={!checked}
            onChange={(e) => onPctChange(Number(e.target.value) || 0)}
            className="w-16 rounded border border-steel-200 px-2 py-1 text-right font-mono text-navy-900 outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20 disabled:bg-steel-50 disabled:text-steel-400"
          />
          <span className="text-xs text-steel-500">%</span>
        </div>
        <span className={`w-28 text-right font-mono text-sm ${checked ? "text-navy-900" : "text-steel-400"}`}>
          {currencyFormatter.format(monto)}
        </span>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-navy-800">{label}</span>
      <input
        type={type}
        className="w-full rounded-md border border-steel-200 bg-white px-3 py-2 text-navy-900 outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
