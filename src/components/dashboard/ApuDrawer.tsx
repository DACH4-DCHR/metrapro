import { useEffect } from "react";
import { X, Calculator } from "lucide-react";
import { ApuEditor } from "./ApuEditor";
import { currencyFormatter, numberFormatter } from "../../lib/formatters";
import type { PresupuestoRow } from "../../lib/presupuesto";
import type { ApuDef } from "../../lib/apu";

function ApuDrawerBody({
  row,
  onClose,
  onApuChange,
}: {
  row: PresupuestoRow;
  onClose: () => void;
  onApuChange: (partida: string, unidad: string, apu: ApuDef | null) => void;
}) {
  if (!row.apu) return null;
  return (
    <>
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
    </>
  );
}

// Panel del APU de una partida: en escritorio es hermano del contenido de la
// página dentro de un flex row (mismo patrón que HelpPanel) — al abrirse
// achica la tabla de Presupuesto en vez de taparla con un overlay, y queda
// fijo (sticky) mientras se hace scroll. En pantalla angosta no hay espacio
// para achicar, así que se muestra como overlay a pantalla completa.
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
      <div
        className="fixed inset-0 z-50 md:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Análisis de Precio Unitario"
      >
        <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
        <div className="relative ml-auto flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
          <ApuDrawerBody row={row} onClose={onClose} onApuChange={onApuChange} />
        </div>
      </div>

      <aside
        className="sticky top-6 mb-6 mr-6 mt-6 hidden max-h-[calc(100vh-3rem)] w-full max-w-md shrink-0 flex-col self-start overflow-hidden rounded-lg border border-steel-200 bg-white shadow-md md:flex"
        aria-label="Análisis de Precio Unitario"
      >
        <ApuDrawerBody row={row} onClose={onClose} onApuChange={onApuChange} />
      </aside>
    </>
  );
}
