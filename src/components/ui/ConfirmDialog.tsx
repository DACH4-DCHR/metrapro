import { AlertTriangle } from "lucide-react";

// Confirmación propia en vez de window.confirm(): el confirm() nativo del
// navegador queda bloqueado en el panel de vista previa (y en algunos
// navegadores con bloqueo de diálogos emergentes), así que un botón que
// dependa de él puede no hacer nada al hacer clic.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div className="relative w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-navy-900">{title}</h2>
            <p className="mt-1 text-xs text-steel-600">{message}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md border border-steel-200 px-3 py-1.5 text-xs font-medium text-steel-600 hover:bg-steel-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
