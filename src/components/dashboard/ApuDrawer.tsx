import { useEffect } from "react";
import { X, Calculator } from "lucide-react";
import { ApuEditor } from "./ApuEditor";
import { currencyFormatter, numberFormatter } from "../../lib/formatters";
import type { PresupuestoRow } from "../../lib/presupuesto";
import type { ApuDef } from "../../lib/apu";

// Panel lateral fijo a la derecha para editar el APU de una partida, en vez
// de expandirlo dentro de la fila de la tabla (eso empujaba las filas
// siguientes y apretaba el editor contra el ancho angosto de la tabla).
// Se abre con la etiqueta "APU" de PresupuestoGrupoRows; la tabla no se mueve.
export function ApuDrawer({
  row,
  onClose,
  onApuChange,
}: {
  row: PresupuestoRow | null;
  onClose: () => void;
  onApuChange: (partida: string, unidad: string, apu: ApuDef | null) => void;
}) {
  useEffect(() => {
    if (!row) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [row, onClose]);

  if (!row || !row.apu) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-navy-950/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-steel-200 bg-white shadow-xl sm:w-[440px]">
        <div className="flex items-start justify-between gap-2 border-b border-steel-200 px-4 py-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-navy-500">
              <Calculator size={12} />
              Análisis de Precio Unitario
            </div>
            <p className="truncate text-sm font-semibold text-navy-900">{row.line.partida}</p>
            <p className="text-xs text-steel-500">
              {row.line.unidad} · cantidad {numberFormatter.format(row.line.cantidad)} · parcial{" "}
              {currencyFormatter.format(row.subtotal)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded p-1 text-steel-500 hover:bg-steel-100 hover:text-navy-900"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <ApuEditor
            apu={row.apu}
            onChange={(apu) => onApuChange(row.line.partida, row.line.unidad, apu)}
            onRemove={() => {
              onApuChange(row.line.partida, row.line.unidad, null);
              onClose();
            }}
          />
        </div>
      </div>
    </>
  );
}
