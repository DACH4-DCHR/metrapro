import { useState } from "react";
import { Wallet, BarChart3 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { HorizontalBarChart } from "../components/charts/HorizontalBarChart";
import { ExportSectionButtons } from "../components/dashboard/ExportSectionButtons";
import { AddCustomLineForm } from "../components/dashboard/AddCustomLineForm";
import { BudgetLineRow } from "../components/dashboard/BudgetLineRow";
import { PresupuestoGrupoRows } from "../components/dashboard/PresupuestoGrupoRows";
import { ApuDrawer } from "../components/dashboard/ApuDrawer";
import { ScopeTabs, type ScopeTab } from "../components/dashboard/ScopeTabs";
import { useProjectData } from "../hooks/useProjectData";
import { currencyFormatter } from "../lib/formatters";
import { downloadExcelWorkbook, buildPresupuestoPorModuloSheet } from "../lib/reports/excelReport";
import { GG_PCT_KEY, UT_PCT_KEY, IGV_PCT_KEY } from "../lib/presupuesto";
import { JORNAL } from "../lib/apu";

export function PresupuestoPage() {
  const d = useProjectData();
  const [tab, setTab] = useState<ScopeTab>("todo");
  const [apuDrawerKey, setApuDrawerKey] = useState<string | null>(null);

  const secciones =
    tab === "estructural" ? d.presupuestoSeccionesEstructural : tab === "acabados" ? d.presupuestoSeccionesAcabados : d.presupuestoSecciones;
  const apuDrawerRow = apuDrawerKey
    ? secciones.flatMap((g) => g.rows).find((r) => r.key === apuDrawerKey) ?? null
    : null;
  const costoDirectoVista =
    tab === "estructural" ? d.subtotalPresupuestoEstructural : tab === "acabados" ? d.subtotalPresupuestoAcabados : d.presupuesto.costoDirecto;
  const customItemsPorGrupo = (label: string) => {
    if (label === "Movilización de Equipo") return [];
    if (tab === "acabados") return d.presupuestoCustomAcabados;
    if (tab === "estructural") return d.presupuestoCustomEstructural;
    return d.presupuestoCustom;
  };

  // Partida sin APU (una agregada a mano, por ejemplo): le crea un APU en
  // blanco con un solo renglón de mano de obra — materiales y equipos quedan
  // vacíos, listos para agregarse si hacen falta — y abre el panel para
  // completarlo.
  function handleAddApu(key: string, partida: string, unidad: string) {
    d.setApuOverride(partida, unidad, {
      materiales: [],
      manoObra: [{ categoria: "Peón", cuadrilla: 1, rendimiento: 1, jornal: JORNAL.Peón }],
      equipos: [],
    });
    setApuDrawerKey(key);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <PageHeader title="Presupuesto" subtitle="Costo directo por categoría y presupuesto referencial" icon={<Wallet size={20} />} helpKey="presupuesto" />

      <div className="flex min-w-0 flex-1">
      <div className="min-w-0 flex-1">
      <div className="flex flex-col gap-6 p-6">
        <ScopeTabs value={tab} onChange={setTab} />

        {(d.costosEstructurales.length > 0 || d.costosAcabadosCategoria.length > 0) && (
          <SectionCard title="Costo directo por categoría" icon={<BarChart3 size={16} className="text-navy-700" />}>
            <p className="mb-3 text-xs text-steel-500">
              Reparto del costo directo del presupuesto (sin Gastos Generales, Utilidad ni IGV) por sección real de obra.
            </p>
            {(tab === "todo" || tab === "estructural") && d.costosEstructurales.length > 0 && (
              <div className={tab === "todo" && d.costosAcabadosCategoria.length > 0 ? "mb-5" : ""}>
                {tab === "todo" && (
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">Metrados Estructurales</p>
                    <span className="font-mono text-xs font-semibold text-steel-500">
                      {currencyFormatter.format(d.subtotalCostosEstructurales)}
                    </span>
                  </div>
                )}
                <HorizontalBarChart
                  items={d.costosEstructurales.map((c) => ({ label: c.categoria, value: c.monto, color: c.color, subLabel: `${c.pct.toFixed(1)}%` }))}
                  valueFormatter={(v) => currencyFormatter.format(v)}
                />
              </div>
            )}
            {(tab === "todo" || tab === "acabados") && d.costosAcabadosCategoria.length > 0 && (
              <div>
                {tab === "todo" && (
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">Acabados y Adicionales</p>
                    <span className="font-mono text-xs font-semibold text-steel-500">
                      {currencyFormatter.format(d.subtotalCostosAcabados)}
                    </span>
                  </div>
                )}
                <HorizontalBarChart
                  items={d.costosAcabadosCategoria.map((c) => ({ label: c.categoria, value: c.monto, color: c.color, subLabel: `${c.pct.toFixed(1)}%` }))}
                  valueFormatter={(v) => currencyFormatter.format(v)}
                />
              </div>
            )}
          </SectionCard>
        )}

        <SectionCard
          title="Presupuesto referencial"
          icon={<Wallet size={16} className="text-navy-700" />}
          headerActions={
            <ExportSectionButtons
              onExcel={() =>
                downloadExcelWorkbook(`presupuesto_${d.safeProjectName}`, [buildPresupuestoPorModuloSheet(secciones, d.presupuesto)])
              }
              onPdf={async () => {
                const { downloadPresupuestoPorModuloPdf } = await import("../lib/reports/pdfReport");
                downloadPresupuestoPorModuloPdf(`presupuesto_${d.safeProjectName}`, "Presupuesto Referencial", secciones, d.presupuesto);
              }}
            />
          }
        >
          <div className="mb-3 text-xs text-steel-500">
            Precios editables (S/.) — se usan valores referenciales por defecto según unidad, ajústalos según tu zona
            y proveedor. Las partidas con la etiqueta <span className="font-semibold text-navy-800">APU</span> traen
            su Análisis de Precios Unitarios (materiales/mano de obra/equipo) desglosado y editable — tócala para
            verlo.
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
                {secciones.map((g) => (
                  <PresupuestoGrupoRows
                    key={g.label}
                    group={g}
                    customItems={customItemsPorGrupo(g.label)}
                    onPriceChange={d.setPrice}
                    onRemoveCustom={d.removeCustomPresupuestoLine}
                    onOpenApu={setApuDrawerKey}
                    onAddApu={handleAddApu}
                    activeApuKey={apuDrawerKey}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-navy-900 bg-steel-100 font-semibold text-navy-900">
                  <td className="px-4 py-2" colSpan={4}>
                    Costo directo {tab !== "todo" ? "de esta vista" : ""} (S/.)
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{currencyFormatter.format(costoDirectoVista)}</td>
                  <td className="no-print" />
                </tr>
              </tfoot>
            </table>
          </div>

          <AddCustomLineForm
            itemLabel="Partida"
            placeholder="Ej. Movilización de personal, cerco perimétrico, etc."
            buttonLabel="Agregar partida"
            onAdd={d.addCustomPresupuestoLine}
            showGroupSelector
          />

          <div className="mt-4 flex flex-col gap-2 border-t border-steel-200 pt-4">
            <p className="mb-1 text-xs text-steel-500">
              Gastos Generales, Utilidad e IGV se calculan sobre el costo directo TOTAL del proyecto, sin importar la pestaña activa.
            </p>
            <BudgetLineRow
              label="Gastos Generales"
              checked={d.presupuesto.ggOn}
              onCheckedChange={d.setGGOn}
              pct={d.presupuesto.ggPct}
              onPctChange={(v) => d.setPrice(GG_PCT_KEY, v)}
              monto={d.presupuesto.montoGG}
              currencyFormatter={currencyFormatter}
            />
            <BudgetLineRow
              label="Utilidad"
              checked={d.presupuesto.utOn}
              onCheckedChange={d.setUTOn}
              pct={d.presupuesto.utPct}
              onPctChange={(v) => d.setPrice(UT_PCT_KEY, v)}
              monto={d.presupuesto.montoUT}
              currencyFormatter={currencyFormatter}
            />
            <BudgetLineRow
              label="IGV"
              checked={d.presupuesto.igvOn}
              onCheckedChange={d.setIGVOn}
              pct={d.presupuesto.igvPct}
              onPctChange={(v) => d.setPrice(IGV_PCT_KEY, v)}
              monto={d.presupuesto.montoIGV}
              currencyFormatter={currencyFormatter}
            />
            <div className="mt-2 flex items-center justify-between border-t-2 border-navy-900 pt-3 text-base font-bold text-navy-900">
              <span>Total general (S/.)</span>
              <span className="font-mono">{currencyFormatter.format(d.presupuesto.totalGeneral)}</span>
            </div>
          </div>
        </SectionCard>
      </div>
      </div>

      <ApuDrawer row={apuDrawerRow} onClose={() => setApuDrawerKey(null)} onApuChange={d.setApuOverride} />
      </div>
    </div>
  );
}
