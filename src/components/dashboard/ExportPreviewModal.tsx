import { useEffect, useMemo } from "react";
import { X, Download } from "lucide-react";
import type { ExcelSheet } from "../../lib/reports/excelReport";

// Vista previa antes de descargar/exportar desde el Presupuesto:
// - PDF: el visor nativo del navegador sobre un blob URL del MISMO documento
//   que se va a descargar (ver buildPresupuestoPorModuloDoc) — lo que se ve
//   acá es exactamente lo que se descarga.
// - Excel: no se puede previsualizar un .xls dentro de la página (los
//   navegadores no lo renderizan), así que se muestra una tabla HTML con los
//   mismos datos de la hoja (ExcelSheet) que arma el archivo real.
export type ExportPreview = { kind: "pdf"; blobUrl: string } | { kind: "excel"; sheet: ExcelSheet };

export function ExportPreviewModal({
  preview,
  onClose,
  onDownload,
}: {
  preview: ExportPreview | null;
  onClose: () => void;
  onDownload: () => void;
}) {
  useEffect(() => {
    if (!preview) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [preview, onClose]);

  useEffect(() => {
    if (preview?.kind !== "pdf") return;
    const url = preview.blobUrl;
    return () => URL.revokeObjectURL(url);
  }, [preview]);

  if (!preview) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Vista previa de exportación">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative flex h-full max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-steel-200 px-4 py-3">
          <h2 className="text-sm font-bold text-navy-900">
            Vista previa — {preview.kind === "pdf" ? "PDF" : "Excel"}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 rounded-md bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-700"
            >
              <Download size={13} />
              Descargar
            </button>
            <button onClick={onClose} aria-label="Cerrar vista previa" className="rounded p-1 text-steel-500 hover:bg-steel-100">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-steel-100 p-2">
          {preview.kind === "pdf" ? (
            <iframe src={preview.blobUrl} title="Vista previa del PDF" className="h-full min-h-[70vh] w-full rounded border border-steel-300 bg-white" />
          ) : (
            <ExcelSheetPreview sheet={preview.sheet} />
          )}
        </div>
      </div>
    </div>
  );
}

function ExcelSheetPreview({ sheet }: { sheet: ExcelSheet }) {
  const boldSet = useMemo(() => new Set(sheet.boldRows ?? []), [sheet.boldRows]);
  const numericSet = useMemo(() => new Set(sheet.numericCols ?? []), [sheet.numericCols]);

  return (
    <table className="w-full min-w-[640px] border-collapse bg-white text-sm">
      <thead>
        <tr className="bg-navy-900 text-left text-white">
          {sheet.headers.map((h, i) => (
            <th key={i} className="px-3 py-2 font-semibold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sheet.rows.map((row, i) => (
          <tr key={i} className={boldSet.has(i) ? "bg-steel-100 font-semibold text-navy-900" : i % 2 === 0 ? "bg-white" : "bg-steel-50"}>
            {row.map((cell, j) => (
              <td key={j} className={`px-3 py-1.5 ${numericSet.has(j) ? "text-right font-mono" : ""}`}>
                {cell === "" ? "" : cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
