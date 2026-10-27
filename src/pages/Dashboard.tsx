import { useMemo, useRef } from "react";
import {
  LayoutDashboard,
  Building2,
  ImageOff,
  Upload,
  Users,
  BrickWall,
  Wallet,
  FileSpreadsheet,
  FileDown,
  Send,
  BarChart3,
  TrendingUp,
  Scale,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { StatCard } from "../components/ui/StatCard";
import { DonutChart } from "../components/charts/DonutChart";
import { useProjectData } from "../hooks/useProjectData";
import { currencyFormatter } from "../lib/formatters";
import { generateExcelReport } from "../lib/reports/excelReport";

const MAX_LOGO_BYTES = 1_000_000;

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

const TOP_PARTIDAS_COUNT = 6;

export function DashboardPage() {
  const d = useProjectData();
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Ranking de las partidas con mayor impacto en el costo directo de todo el
  // proyecto — se arma a partir de presupuestoSecciones (mismas filas que el
  // Presupuesto Referencial, ya con el acero consolidado por módulo en una
  // sola partida) en vez de presupuesto.rows "plano", para poder mostrar de
  // qué módulo/sección viene cada una.
  const topPartidas = useMemo(() => {
    return d.presupuestoSecciones
      .flatMap((g) => g.rows.map((r) => ({ ...r, grupo: g.label })))
      .filter((r) => r.subtotal > 0)
      .sort((a, b) => b.subtotal - a.subtotal)
      .slice(0, TOP_PARTIDAS_COUNT);
  }, [d.presupuestoSecciones]);
  const maxTopPartida = topPartidas[0]?.subtotal ?? 0;

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      alert("El logo es muy pesado. Usa una imagen menor a 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => d.setProjectInfo({ logoDataUrl: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const hayContenidoParaExportar =
    d.consolidated.length > 0 || d.presupuestoCustom.length > 0 || d.materialesCustom.length > 0;

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
                  d.projectInfo,
                  d.allElements,
                  d.consolidated,
                  d.prices,
                  d.materialesExportLines,
                  d.materiales.totalVarillas,
                  d.presupuestoCustom
                )
              }
              disabled={!hayContenidoParaExportar}
              className="flex items-center gap-2 rounded-md border border-steel-300 bg-white px-4 py-2 text-sm font-semibold text-navy-800 transition-colors hover:bg-steel-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet size={16} />
              Exportar Excel
            </button>
            <button
              onClick={d.handleDownloadPdf}
              disabled={!hayContenidoParaExportar || d.generatingPdf}
              className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-navy-950 shadow-sm transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileDown size={16} />
              {d.generatingPdf ? "Generando..." : "Descargar PDF"}
            </button>
            <button
              onClick={d.handleSharePdf}
              disabled={!hayContenidoParaExportar || d.sharingPdf}
              className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={16} />
              {d.sharingPdf ? "Preparando..." : "Enviar"}
            </button>
          </div>
        }
      />

      <div className="flex flex-col gap-6 p-6">
        <SectionCard title="Datos del proyecto" icon={<Building2 size={16} className="text-navy-700" />}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-steel-300 bg-steel-50">
                {d.projectInfo.logoDataUrl ? (
                  <img src={d.projectInfo.logoDataUrl} alt="Logo de la empresa" className="h-full w-full object-contain" />
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
                  {d.projectInfo.logoDataUrl ? "Cambiar logo" : "Subir logo de la empresa"}
                </button>
                <span className="text-xs text-steel-500">Aparecerá en el reporte PDF. Máx. 1 MB.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Field label="Nombre de obra" value={d.projectInfo.nombreObra} onChange={(v) => d.setProjectInfo({ nombreObra: v })} />
              <Field label="Cliente" value={d.projectInfo.cliente} onChange={(v) => d.setProjectInfo({ cliente: v })} />
              <Field label="Ubicación" value={d.projectInfo.ubicacion} onChange={(v) => d.setProjectInfo({ ubicacion: v })} />
              <Field label="Responsable" value={d.projectInfo.responsable} onChange={(v) => d.setProjectInfo({ responsable: v })} />
              <Field label="Fecha" value={d.projectInfo.fecha} type="date" onChange={(v) => d.setProjectInfo({ fecha: v })} />
            </div>
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <StatCard
            label="Mano de obra"
            value={currencyFormatter.format(d.manoObraMateriales.manoObra)}
            subLabel={`${d.manoObraMateriales.pctManoObra.toFixed(1)}%`}
            icon={<Users size={26} />}
            accentColor="#2a78d6"
          />
          <StatCard
            label="Materiales"
            value={currencyFormatter.format(d.manoObraMateriales.materiales)}
            subLabel={`${d.manoObraMateriales.pctMateriales.toFixed(1)}%`}
            icon={<BrickWall size={26} />}
            accentColor="#eb6834"
          />
          <StatCard
            label="Presupuesto general"
            value={currencyFormatter.format(d.presupuesto.costoDirecto)}
            subLabel="Mano de obra + materiales"
            subLabelColor="#8695a3"
            icon={<Wallet size={26} />}
            accentColor="#d98c2b"
          />
        </div>

        {d.costosCategoria.length > 0 && (
          <SectionCard title="Costo por categoría" icon={<BarChart3 size={16} className="text-navy-700" />}>
            <p className="mb-4 text-xs text-steel-500">
              Reparto del costo directo por tipo de recurso. Pasa el mouse (o toca) una categoría para ver su porcentaje.
            </p>
            <DonutChart
              items={d.costosCategoria.map((c) => ({ label: c.categoria, value: c.monto, pct: c.pct, color: c.color }))}
              centerValue={currencyFormatter.format(d.presupuesto.costoDirecto)}
              centerLabel="Costo directo"
              valueFormatter={(v) => currencyFormatter.format(v)}
            />
          </SectionCard>
        )}

        {d.presupuesto.costoDirecto > 0 && (
          <SectionCard title="Estructural vs. Acabados" icon={<Scale size={16} className="text-navy-700" />}>
            <div className="mb-3 flex h-3.5 overflow-hidden rounded-full">
              <div
                className="h-full bg-navy-900"
                style={{ width: `${(d.subtotalCostosEstructurales / d.presupuesto.costoDirecto) * 100}%` }}
              />
              <div
                className="h-full bg-amber-500"
                style={{ width: `${(d.subtotalCostosAcabados / d.presupuesto.costoDirecto) * 100}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-navy-900">
                <span className="h-2 w-2 shrink-0 rounded-sm bg-navy-900" />
                Estructural · {currencyFormatter.format(d.subtotalCostosEstructurales)} (
                {((d.subtotalCostosEstructurales / d.presupuesto.costoDirecto) * 100).toFixed(1)}%)
              </span>
              <span className="flex items-center gap-1.5 text-navy-900">
                <span className="h-2 w-2 shrink-0 rounded-sm bg-amber-500" />
                Acabados · {currencyFormatter.format(d.subtotalCostosAcabados)} (
                {((d.subtotalCostosAcabados / d.presupuesto.costoDirecto) * 100).toFixed(1)}%)
              </span>
            </div>
          </SectionCard>
        )}

        {topPartidas.length > 0 && (
          <SectionCard title="Partidas más costosas" icon={<TrendingUp size={16} className="text-navy-700" />}>
            <p className="mb-4 text-xs text-steel-500">
              Las partidas con mayor impacto en el costo directo de todo el proyecto.
            </p>
            <div className="flex flex-col gap-3">
              {topPartidas.map((row, idx) => {
                const pct = maxTopPartida > 0 ? (row.subtotal / maxTopPartida) * 100 : 0;
                return (
                  <div key={row.key} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium text-navy-900">{row.line.partida}</p>
                        <p className="shrink-0 font-mono text-sm font-bold text-navy-900">
                          {currencyFormatter.format(row.subtotal)}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-steel-100">
                          <div
                            className="h-full rounded-full bg-amber-500"
                            style={{ width: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-[11px] text-steel-500">{row.grupo}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
