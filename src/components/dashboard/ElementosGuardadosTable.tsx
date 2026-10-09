import { Trash2 } from "lucide-react";
import { numberFormatter } from "../../lib/formatters";
import { moduleMeta } from "./moduleMeta";
import type { CalculatedElement } from "../../lib/types";

// Tabla de "Elementos guardados" para un grupo (Metrados Estructurales o
// Acabados y Adicionales) — la misma tabla de siempre, factorizada para no
// duplicarla cuando se muestran por separado (pestañas de Metrados).
export function ElementosGuardadosTable({
  items,
  onRemove,
}: {
  items: CalculatedElement[];
  onRemove: (id: string) => void;
}) {
  return (
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
          {items.map((el) => {
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
                    onClick={() => onRemove(el.id)}
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
  );
}
