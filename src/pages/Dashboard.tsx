import { useMemo } from "react";
import {
  LayoutDashboard,
  Box,
  Weight,
  Frame,
  Layers3,
  RectangleHorizontal,
  MoveUpRight,
  Trash2,
  Printer,
  FileSpreadsheet,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { StatCard } from "../components/ui/StatCard";
import { ResultTable } from "../components/ui/ResultTable";
import { useProjectStore } from "../store/projectStore";
import type { MetradoLine, ModuleType } from "../lib/types";

const numberFormatter = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 });

const moduleMeta: Record<ModuleType, { label: string; icon: typeof Layers3 }> = {
  losa: { label: "Losa Aligerada", icon: Layers3 },
  viga: { label: "Viga", icon: RectangleHorizontal },
  escalera: { label: "Escalera", icon: MoveUpRight },
};

function consolidateLines(allLines: MetradoLine[][]): MetradoLine[] {
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

function downloadCsv(filename: string, rows: MetradoLine[]) {
  const header = "Partida,Unidad,Cantidad";
  const body = rows
    .map((r) => `"${r.partida.replace(/"/g, '""')}",${r.unidad},${r.cantidad.toFixed(3)}`)
    .join("\n");
  const csv = `${header}\n${body}`;
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function DashboardPage() {
  const projectInfo = useProjectStore((s) => s.projectInfo);
  const setProjectInfo = useProjectStore((s) => s.setProjectInfo);
  const elements = useProjectStore((s) => s.elements);
  const removeElement = useProjectStore((s) => s.removeElement);

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

  return (
    <div>
      <PageHeader
        title="Dashboard del Proyecto"
        subtitle="Resumen general de metrados calculados"
        icon={<LayoutDashboard size={20} />}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadCsv(`metrados_${projectInfo.nombreObra || "proyecto"}.csv`, consolidated)}
              disabled={consolidated.length === 0}
              className="flex items-center gap-2 rounded-md border border-steel-300 bg-white px-4 py-2 text-sm font-semibold text-navy-800 transition-colors hover:bg-steel-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet size={16} />
              Exportar Excel (CSV)
            </button>
            <button
              onClick={() => window.print()}
              disabled={consolidated.length === 0}
              className="flex items-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer size={16} />
              Imprimir / PDF
            </button>
          </div>
        }
      />

      <div className="flex flex-col gap-6 p-6">
        <SectionCard title="Datos del proyecto">
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

        <SectionCard title="Elementos guardados">
          {elements.length === 0 ? (
            <p className="py-6 text-center text-sm text-steel-500">
              Aún no has guardado ningún elemento. Ve a un módulo (Losa Aligerada, Vigas o Escaleras), calcula y
              presiona "Guardar elemento".
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
          <SectionCard title="Cuadro de metrados consolidado">
            <ResultTable lines={consolidated} />
          </SectionCard>
        )}
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
