import { useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";

// Par de íconos pequeños y discretos en el encabezado de una SectionCard para
// exportar solo esa tabla, sin tener que descargar el reporte completo. Colores
// distintos al fondo ámbar del encabezado y entre sí (verde Excel / rojo PDF),
// siguiendo la convención de esos formatos.
export function ExportSectionButtons({ onExcel, onPdf }: { onExcel: () => void; onPdf: () => void | Promise<void> }) {
  const [generating, setGenerating] = useState(false);

  async function handlePdf() {
    setGenerating(true);
    try {
      await onPdf();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={onExcel}
        aria-label="Exportar esta sección a Excel"
        title="Exportar esta sección a Excel"
        className="rounded p-1 text-green-600 hover:bg-green-50"
      >
        <FileSpreadsheet size={15} />
      </button>
      <button
        onClick={handlePdf}
        disabled={generating}
        aria-label="Exportar esta sección a PDF"
        title="Exportar esta sección a PDF"
        className="rounded p-1 text-red-600 hover:bg-red-50 disabled:cursor-wait disabled:opacity-50"
      >
        <FileText size={15} />
      </button>
    </div>
  );
}
