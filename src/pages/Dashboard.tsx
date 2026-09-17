import { Fragment, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  Box,
  Weight,
  Frame,
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
  MessageCircle,
  BarChart3,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { StatCard } from "../components/ui/StatCard";
import { ResultTable } from "../components/ui/ResultTable";
import { HorizontalBarChart } from "../components/charts/HorizontalBarChart";
import { costosPorCategoria, cantidadesPorModulo } from "../lib/dashboardCharts";
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
import type { ModuleType } from "../lib/types";

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

export function DashboardPage() {
  const projectInfo = useProjectStore((s) => s.projectInfo);
  const setProjectInfo = useProjectStore((s) => s.setProjectInfo);
  const elements = useProjectStore((s) => s.elements);
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

  const totals = useMemo(() => {
    return elements.reduce(
      (acc, el) => {
        acc.concreteM3 += el.concreteM3;
        acc.steelKg += el.steelKg;
        acc.formworkM2 += el.formworkM2;
        return acc;
      },
      { concreteM3: 0, steelKg: 0, formworkM2: 0 }
    );
  }, [elements]);

  const consolidated = useMemo(() => consolidateLines(elements.map((e) => e.lines)), [elements]);

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

  const costosCategoria = useMemo(() => costosPorCategoria(presupuesto.rows), [presupuesto.rows]);
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

  const materialesFootRowsExcel = useMemo(() => {
    const rows: (string | number)[][] = materiales.acero.map((r) => [
      `Varillas Ø${r.diametroMm}mm x 9m (habilitación)`,
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

  function addCustomPresupuestoLine(partida: string, unidad: string, cantidad: number) {
    const item: PresupuestoCustomLine = { id: crypto.randomUUID(), partida, unidad, cantidad };
    setPresupuestoCustomStore([...presupuestoCustom, item]);
  }
  function removeCustomPresupuestoLine(id: string) {
    setPresupuestoCustomStore(presupuestoCustom.filter((p) => p.id !== id));
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
        elements,
        consolidated,
        prices,
        materialesExportLines,
        materiales.totalVarillas,
        presupuestoCustom
      );
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function handleShareWhatsApp() {
    setSharingPdf(true);
    try {
      if (isStandaloneApp()) {
        const { generatePdfReport } = await import("../lib/reports/pdfReport");
        generatePdfReport(
          projectInfo,
          elements,
          consolidated,
          prices,
          materialesExportLines,
          materiales.totalVarillas,
          presupuestoCustom
        );
        alert(
          'La app instalada no puede compartir archivos directamente (una limitación de Android). Se descargó el PDF: ábrelo desde tus Descargas y compártelo por WhatsApp manualmente, o entra a metrapro.vercel.app desde Chrome (sin usar el ícono instalado) para compartirlo en un solo paso.'
        );
        return;
      }

      const { sharePdfReport } = await import("../lib/reports/pdfReport");
      const shared = await sharePdfReport(
        projectInfo,
        elements,
        consolidated,
        prices,
        materialesExportLines,
        materiales.totalVarillas,
        presupuestoCustom
      );
      if (!shared) {
        alert(
          'Tu navegador no permite compartir archivos directamente. Usa el botón "Descargar PDF" y adjúntalo manualmente en WhatsApp.'
        );
      }
    } catch {
      alert("No se pudo compartir el PDF. Intenta descargarlo con el botón de al lado.");
    } finally {
      setSharingPdf(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Dashboard del Proyecto"
        subtitle="Resumen general de metrados calculados"
        icon={<LayoutDashboard size={20} />}
        helpKey="dashboard"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                generateExcelReport(
                  projectInfo,
                  elements,
                  consolidated,
                  prices,
                  materialesExportLines,
                  materiales.totalVarillas,
                  presupuestoCustom
                )
              }
              disabled={consolidated.length === 0}
              className="flex items-center gap-2 rounded-md border border-steel-300 bg-white px-4 py-2 text-sm font-semibold text-navy-800 transition-colors hover:bg-steel-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet size={16} />
              Exportar Excel
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={consolidated.length === 0 || generatingPdf}
              className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-navy-950 shadow-sm transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileDown size={16} />
              {generatingPdf ? "Generando..." : "Descargar PDF"}
            </button>
            <button
              onClick={handleShareWhatsApp}
              disabled={consolidated.length === 0 || sharingPdf}
              className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MessageCircle size={16} />
              {sharingPdf ? "Preparando..." : "WhatsApp"}
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Concreto calculado"
            value={numberFormatter.format(totals.concreteM3)}
            unit="m³"
            icon={<Box size={20} />}
            accent="navy"
          />
          <StatCard
            label="Acero calculado"
            value={numberFormatter.format(totals.steelKg)}
            unit="kg"
            icon={<Weight size={20} />}
            accent="steel"
          />
          <StatCard
            label="Encofrado"
            value={numberFormatter.format(totals.formworkM2)}
            unit="m²"
            icon={<Frame size={20} />}
            accent="navy"
          />
          <StatCard
            label="Elementos calculados"
            value={String(elements.length)}
            icon={<LayoutDashboard size={20} />}
            accent="amber"
          />
        </div>

        {(costosCategoria.length > 0 || cantidadesModulo.length > 0) && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard title="Costo directo por categoría" icon={<BarChart3 size={16} className="text-navy-700" />}>
              <p className="mb-3 text-xs text-steel-500">
                Reparto del costo directo del presupuesto (sin Gastos Generales, Utilidad ni IGV) entre concreto,
                acero, encofrado y el resto de partidas.
              </p>
              <HorizontalBarChart
                items={costosCategoria.map((c) => ({ label: c.categoria, value: c.monto, color: c.color }))}
                valueFormatter={(v) => currencyFormatter.format(v)}
              />
            </SectionCard>

            <SectionCard title="Metrados por módulo" icon={<BarChart3 size={16} className="text-navy-700" />}>
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

        <SectionCard title="Elementos guardados" icon={<ListChecks size={16} className="text-navy-700" />}>
          {elements.length === 0 ? (
            <p className="py-6 text-center text-sm text-steel-500">
              Aún no has guardado ningún elemento. Ve a un módulo (Losa Aligerada, Vigas o Escaleras), calcula y
              presiona "Agregar a la lista".
            </p>
          ) : (
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
                  {elements.map((el) => {
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
                            onClick={() => removeElement(el.id)}
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
            <ResultTable lines={consolidated} />
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
                                Ø{r.diametroMm}mm <span className="text-xs text-steel-500">({r.weightKgPerM.toFixed(3)} kg/m)</span>
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
                {presupuestoSecciones.map((group) => {
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
                                onClick={() => removeCustomPresupuestoLine(presupuestoCustom[idx].id)}
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
                })}
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
                    `Varillas Ø${r.diametroMm}mm x 9m (habilitación)`,
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
                            <td className="px-4 py-2 text-navy-900">Ø{r.diametroMm}mm</td>
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
}: {
  itemLabel: string;
  placeholder: string;
  buttonLabel: string;
  onAdd: (partida: string, unidad: string, cantidad: number) => void;
}) {
  const [partida, setPartida] = useState("");
  const [unidad, setUnidad] = useState("und");
  const [cantidad, setCantidad] = useState(1);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partida.trim() || cantidad <= 0) return;
    onAdd(partida.trim(), unidad.trim() || "und", cantidad);
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
