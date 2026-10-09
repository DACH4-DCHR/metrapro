import { useMemo, useState } from "react";
import { ListChecks, ClipboardList, Weight, ShoppingCart, Trash2 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { ResultTable } from "../components/ui/ResultTable";
import { ElementosGuardadosTable } from "../components/dashboard/ElementosGuardadosTable";
import { ExportSectionButtons } from "../components/dashboard/ExportSectionButtons";
import { AddCustomLineForm } from "../components/dashboard/AddCustomLineForm";
import { PriceInput } from "../components/dashboard/PriceInput";
import { ScopeTabs, type ScopeTab } from "../components/dashboard/ScopeTabs";
import { moduleMeta } from "../components/dashboard/moduleMeta";
import { useProjectData } from "../hooks/useProjectData";
import { numberFormatter, currencyFormatter } from "../lib/formatters";
import { downloadExcelWorkbook, buildMetradoLineasSheet, buildValorizadoSheet } from "../lib/reports/excelReport";
import { MODULE_GROUP } from "../lib/moduleGroups";
import { LONGITUD_VARILLA_COMERCIAL_M } from "../lib/calc/aceroResumen";

export function MetradosPage() {
  const d = useProjectData();
  const [tab, setTab] = useState<ScopeTab>("todo");

  const elementosGuardados =
    tab === "estructural" ? d.elementosEstructuralesGuardados : tab === "acabados" ? d.elementosAcabadosGuardados : d.elements;
  const consolidadoLineas =
    tab === "estructural" ? d.consolidatedEstructural : tab === "acabados" ? d.consolidatedAcabadosLines : d.consolidated;
  const aceroPorModuloFiltrado = useMemo(
    () => (tab === "todo" ? d.aceroPorModulo : d.aceroPorModulo.filter(({ module }) => MODULE_GROUP[module] === tab)),
    [d.aceroPorModulo, tab]
  );

  const safeProjectName = d.safeProjectName;

  return (
    <div>
      <PageHeader
        title="Metrados"
        subtitle="Elementos guardados, cuadro consolidado, acero por diámetro y materiales"
        icon={<ClipboardList size={20} />}
        helpKey="metrados"
      />

      <div className="flex flex-col gap-6 p-6">
        <ScopeTabs value={tab} onChange={setTab} />

        <SectionCard title="Elementos guardados" icon={<ListChecks size={16} className="text-navy-700" />} collapsible>
          {elementosGuardados.length === 0 ? (
            <p className="py-6 text-center text-sm text-steel-500">
              {tab === "acabados"
                ? 'Aún no has guardado ningún elemento de Acabados. Ve al módulo de Arquitectura, calcula y presiona "Agregar a la lista".'
                : tab === "estructural"
                  ? 'Aún no has guardado ningún elemento estructural. Ve a un módulo (Losa Aligerada, Vigas o Escaleras), calcula y presiona "Agregar a la lista".'
                  : 'Aún no has guardado ningún elemento. Ve a un módulo, calcula y presiona "Agregar a la lista".'}
            </p>
          ) : (
            <ElementosGuardadosTable items={elementosGuardados} onRemove={d.removeElement} />
          )}
        </SectionCard>

        {consolidadoLineas.length > 0 && (
          <SectionCard
            title="Cuadro de metrados consolidado"
            icon={<ClipboardList size={16} className="text-navy-700" />}
            collapsible
            headerActions={
              <ExportSectionButtons
                onExcel={() =>
                  downloadExcelWorkbook(`metrados_${safeProjectName}`, [buildMetradoLineasSheet("Metrados Consolidado", consolidadoLineas)])
                }
                onPdf={async () => {
                  const { downloadMetradoLineasPdf } = await import("../lib/reports/pdfReport");
                  downloadMetradoLineasPdf(`metrados_${safeProjectName}`, "Cuadro de Metrados Consolidado", consolidadoLineas);
                }}
              />
            }
          >
            <ResultTable lines={consolidadoLineas} />
          </SectionCard>
        )}

        {(aceroPorModuloFiltrado.length > 0 || d.elementosSinDesglose.length > 0) && (
          <SectionCard title="Acero de refuerzo por diámetro y elemento" icon={<Weight size={16} className="text-navy-700" />} collapsible>
            <div className="mb-3 text-xs text-steel-500">
              Habilitación de acero agrupada por diámetro dentro de cada tipo de elemento (vigas, columnas, losas,
              etc.), en varillas comerciales de {LONGITUD_VARILLA_COMERCIAL_M} m.
            </div>
            {d.elementosSinDesglose.length > 0 && (
              <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {d.elementosSinDesglose.length === 1 ? (
                  <>
                    El elemento <strong>{d.elementosSinDesglose[0].name}</strong> fue calculado antes de esta función y
                    no tiene desglose por diámetro.
                  </>
                ) : (
                  <>
                    {d.elementosSinDesglose.length} elementos ({d.elementosSinDesglose.map((e) => e.name).join(", ")})
                    fueron calculados antes de esta función y no tienen desglose por diámetro.
                  </>
                )}{" "}
                Vuelve a calcularlos y presiona "Agregar a la lista" de nuevo para incluirlos aquí.
              </div>
            )}
            <div className="flex flex-col gap-5">
              {aceroPorModuloFiltrado.map(({ module, resumen }) => {
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
                            <th className="px-4 py-2 text-right font-semibold">Varillas x {LONGITUD_VARILLA_COMERCIAL_M}m (und)</th>
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

        {d.materialesLines.length > 0 && (
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
                      [...d.derivedValorizado.rows, ...d.customValorizado.rows, ...d.aceroValorizado.rows],
                      d.materialesFootRowsExcel
                    ),
                  ])
                }
                onPdf={async () => {
                  const { downloadValorizadoPdf } = await import("../lib/reports/pdfReport");
                  const footRows: (string | number)[][] = d.materiales.acero.map((r) => [
                    `Varillas Ø ${r.symbol} x 9m (habilitación)`,
                    "und",
                    String(r.numeroVarillas),
                    "",
                    "",
                  ]);
                  footRows.push(["", "", "", "Costo total de materiales (S/.)", currencyFormatter.format(d.costoTotalMateriales)]);
                  downloadValorizadoPdf(
                    `materiales_${safeProjectName}`,
                    "Metrado de Materiales",
                    [...d.derivedValorizado.rows, ...d.customValorizado.rows, ...d.aceroValorizado.rows],
                    footRows
                  );
                }}
              />
            }
          >
            <div className="mb-3 text-xs text-steel-500">
              Lista de materiales a comprar, lista para enviar al cliente — siempre junta (cemento y arena sirven
              igual para estructuras y acabados, no tiene sentido separarlos por pestaña). El cemento, arena, piedra
              y agua se calculan a partir del concreto y el mortero de tarrajeo usando dosificaciones referenciales —
              ajústalas si tu diseño de mezcla real difiere. Los precios se toman de los mismos que editas en el
              Presupuesto Referencial (o el valor por defecto según unidad); también puedes ajustarlos aquí
              directamente.
            </div>
            {d.materiales.fcNoReconocidos.length > 0 && (
              <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                No se reconoce una dosificación referencial para f'c={d.materiales.fcNoReconocidos.join(", ")} kg/cm²;
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
                  {d.derivedValorizado.rows.map((row, idx) => (
                    <tr key={row.key} className={idx % 2 === 0 ? "bg-white" : "bg-steel-50"}>
                      <td className="px-4 py-2 text-navy-900">{row.line.partida}</td>
                      <td className="px-4 py-2 text-steel-600">{row.line.unidad}</td>
                      <td className="px-4 py-2 text-right font-mono">{numberFormatter.format(row.line.cantidad)}</td>
                      <td className="px-4 py-2 text-right">
                        <PriceInput value={row.price} onChange={(v) => d.setPrice(row.key, v)} />
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-medium text-navy-900">
                        {currencyFormatter.format(row.subtotal)}
                      </td>
                      <td className="px-4 py-2 no-print" />
                    </tr>
                  ))}
                  {d.customValorizado.rows.map((row, idx) => (
                    <tr key={row.key} className={(d.derivedValorizado.rows.length + idx) % 2 === 0 ? "bg-white" : "bg-steel-50"}>
                      <td className="px-4 py-2 text-navy-900">{row.line.partida}</td>
                      <td className="px-4 py-2 text-steel-600">{row.line.unidad}</td>
                      <td className="px-4 py-2 text-right font-mono">{numberFormatter.format(row.line.cantidad)}</td>
                      <td className="px-4 py-2 text-right">
                        <PriceInput value={row.price} onChange={(v) => d.setPrice(row.key, v)} />
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-medium text-navy-900">
                        {currencyFormatter.format(row.subtotal)}
                      </td>
                      <td className="px-4 py-2 no-print">
                        <button
                          onClick={() => d.removeCustomMaterial(d.materialesCustom[idx].id)}
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
                      {currencyFormatter.format(d.derivedValorizado.total + d.customValorizado.total)}
                    </td>
                    <td className="no-print" />
                  </tr>
                </tfoot>
              </table>
            </div>

            <AddCustomLineForm itemLabel="Material" placeholder='Ej. Clavos de 3"' buttonLabel="Agregar material" onAdd={d.addCustomMaterial} />

            {d.aceroValorizado.rows.length > 0 && (
              <div className="mt-5">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-900">Acero de refuerzo por diámetro</h4>
                <div className="overflow-x-auto rounded-lg border border-steel-200">
                  <table className="w-full min-w-[560px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-navy-900 text-left text-white">
                        <th className="px-4 py-2 font-semibold">Diámetro</th>
                        <th className="px-4 py-2 text-right font-semibold">Peso (kg)</th>
                        <th className="px-4 py-2 text-right font-semibold">Varillas x {LONGITUD_VARILLA_COMERCIAL_M}m (und)</th>
                        <th className="px-4 py-2 text-right font-semibold">P. Unit. (S/. x kg)</th>
                        <th className="px-4 py-2 text-right font-semibold">Parcial</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.aceroValorizado.rows.map((row, idx) => {
                        const r = d.materiales.acero[idx];
                        return (
                          <tr key={row.key} className={idx % 2 === 0 ? "bg-white" : "bg-steel-50"}>
                            <td className="px-4 py-2 text-navy-900">Ø {r.symbol}</td>
                            <td className="px-4 py-2 text-right font-mono">{numberFormatter.format(row.line.cantidad)}</td>
                            <td className="px-4 py-2 text-right font-mono">{r.numeroVarillas}</td>
                            <td className="px-4 py-2 text-right">
                              <PriceInput value={row.price} onChange={(v) => d.setPrice(row.key, v)} />
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
                          Subtotal acero — {d.materiales.totalVarillas} varilla{d.materiales.totalVarillas === 1 ? "" : "s"} en total
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {numberFormatter.format(d.materiales.acero.reduce((a, r) => a + r.pesoKg, 0))}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">{d.materiales.totalVarillas}</td>
                        <td />
                        <td className="px-4 py-2 text-right font-mono">{currencyFormatter.format(d.aceroValorizado.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t-2 border-navy-900 pt-3 text-base font-bold text-navy-900">
              <span>Costo total de materiales (S/.)</span>
              <span className="font-mono">{currencyFormatter.format(d.costoTotalMateriales)}</span>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
