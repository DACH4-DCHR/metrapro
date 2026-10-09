import { Fragment } from "react";
import { Trash2 } from "lucide-react";
import { numberFormatter, currencyFormatter } from "../../lib/formatters";
import { PriceInput } from "./PriceInput";
import { PRESUPUESTO_CUSTOM_LABEL, type PresupuestoCustomLine, type PresupuestoSeccion } from "../../lib/presupuesto";

// Un grupo (Movilización, un módulo puntual, u "Otros") del Presupuesto
// Referencial: banda con el nombre, sus filas editables, y su subtotal.
// Reutilizado en las pestañas de Presupuesto (Estructural/Acabados) en vez de
// duplicar el bloque.
export function PresupuestoGrupoRows({
  group,
  customItems,
  onPriceChange,
  onRemoveCustom,
}: {
  group: PresupuestoSeccion;
  customItems: PresupuestoCustomLine[];
  onPriceChange: (key: string, value: number) => void;
  onRemoveCustom: (id: string) => void;
}) {
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
            <PriceInput value={row.price} onChange={(v) => onPriceChange(row.key, v)} />
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
