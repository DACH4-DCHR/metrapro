import { useRef } from "react";
import { Link } from "react-router-dom";
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
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { StatCard } from "../components/ui/StatCard";
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

export function ResumenPage() {
  const d = useProjectData();
  const logoInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div>
      <PageHeader
        title="Resumen del Proyecto"
        subtitle="Datos generales y acceso rápido a Metrados y Presupuesto"
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
              disabled={d.consolidated.length === 0}
              className="flex items-center gap-2 rounded-md border border-steel-300 bg-white px-4 py-2 text-sm font-semibold text-navy-800 transition-colors hover:bg-steel-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet size={16} />
              Exportar Excel
            </button>
            <button
              onClick={d.handleDownloadPdf}
              disabled={d.consolidated.length === 0 || d.generatingPdf}
              className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-navy-950 shadow-sm transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileDown size={16} />
              {d.generatingPdf ? "Generando..." : "Descargar PDF"}
            </button>
            <button
              onClick={d.handleSharePdf}
              disabled={d.consolidated.length === 0 || d.sharingPdf}
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            to="/metrados"
            className="group flex items-center justify-between rounded-lg border border-steel-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-navy-900 text-white">
                <ClipboardList size={20} />
              </span>
              <div>
                <p className="font-bold text-navy-900">Metrados</p>
                <p className="text-xs text-steel-500">Elementos guardados, cuadro consolidado, acero y materiales</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-steel-400 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/presupuesto"
            className="group flex items-center justify-between rounded-lg border border-steel-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-500 text-navy-950">
                <Wallet size={20} />
              </span>
              <div>
                <p className="font-bold text-navy-900">Presupuesto</p>
                <p className="text-xs text-steel-500">Costo por categoría y presupuesto referencial</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-steel-400 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}
