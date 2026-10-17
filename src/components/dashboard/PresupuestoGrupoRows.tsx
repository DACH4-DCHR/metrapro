import { Fragment, useState } from "react";
import { Trash2, Calculator, ChevronDown } from "lucide-react";
import { numberFormatter, currencyFormatter } from "../../lib/formatters";
import { PriceInput } from "./PriceInput";
import { ApuEditor } from "./ApuEditor";
import { PRESUPUESTO_CUSTOM_LABEL, type PresupuestoCustomLine, type PresupuestoSeccion } from "../../lib/presupuesto";
import type { ApuDef } from "../../lib/apu";

// Un grupo (Movilización, un módulo puntual, u "Otros") del Presupuesto
// Referencial: banda con el nombre, sus filas editables, y su subtotal.
// Reutilizado en las pestañas de Presupuesto (Estructural/Acabados) en vez de
// duplicar el bloque.
export function PresupuestoGrupoRows({
  group,
  customItems,
  onPriceChange,
  onRemoveCustom,
  onApuChange,
}: {
  group: PresupuestoSeccion;
  customItems: PresupuestoCustomLine[];
  onPriceChange: (key: string, value: number) => void;
  onRemoveCustom: (id: string) => void;
  onApuChange: (partida: string, unidad: string, apu: ApuDef | null) => void;
}) {
  const esOtros = group.label === PRESUPUESTO_CUSTOM_LABEL;
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  return (
    <Fragment key={group.label}>
      <tr className="bg-amber-500/10">
        <td className="px-4 py-1.5 font-semibold uppercase tracking-wide text-navy-800" colSpan={6}>
          {group.label}
        </td>
      </tr>
      {group.rows.map((row, idx) => {
        const isExpanded = expandedKey === row.key;
        return (
          <Fragment key={row.key}>
            <tr className={idx % 2 === 0 ? "bg-white" : "bg-steel-50"}>
              <td className="px-4 py-2 text-navy-900">
                <div className="flex items-center gap-1.5">
                  {row.apu && (
                    <button
                      onClick={() => setExpandedKey(isExpanded ? null : row.key)}
                      className="flex shrink-0 items-center gap-1 rounded bg-navy-900/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy-800 transition-colors hover:bg-navy-900/20"
                      title="Ver/editar APU"
                    >
                      <Calculator size={11} />
                      APU
                      <ChevronDown size={10} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                  )}
                  <span>{row.line.partida}</span>
                </div>
              </td>
              <td className="px-4 py-2 text-steel-600">{row.line.unidad}</td>
              <td className="px-4 py-2 text-right font-mono">{numberFormatter.format(row.line.cantidad)}</td>
              <td className="px-4 py-2 text-right">
                {row.fromApu ? (
                  <span className="ml-auto block w-28 text-right font-mono text-navy-900">
                    {currencyFormatter.format(row.price)}
                  </span>
                ) : (
                  <PriceInput value={row.price} onChange={(v) => onPriceChange(row.key, v)} />
                )}
              </td>
              <td className="px-4 py-2 text-right font-mono font-medium text-navy-900">
                {currencyFormatter.format(row.subtotal)}
              </td>
              <td className="px-4 py-2 no-print">
                {esOtros && (
                  <button
                    onClick={() => onRemoveCustom(customItems[idx].id)}
                    aria-label="Quitar partida"
                    className="rounded p-1 text-steel-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </td>
            </tr>
            {isExpanded && row.apu && (
              <tr className={idx % 2 === 0 ? "bg-white" : "bg-steel-50"}>
                <td colSpan={6} className="px-4 pb-3">
                  <ApuEditor
                    apu={row.apu}
                    onChange={(apu) => onApuChange(row.line.partida, row.line.unidad, apu)}
                    onRemove={() => onApuChange(row.line.partida, row.line.unidad, null)}
                  />
                </td>
              </tr>
            )}
          </Fragment>
        );
      })}
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
