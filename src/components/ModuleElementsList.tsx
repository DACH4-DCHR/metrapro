import { useMemo } from "react";
import { Trash2, Layers } from "lucide-react";
import { useProjectStore } from "../store/projectStore";
import type { ModuleType } from "../lib/types";

const numberFormatter = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 });

interface ModuleElementsListProps {
  module: ModuleType;
  emptyLabel: string;
}

export function ModuleElementsList({ module, emptyLabel }: ModuleElementsListProps) {
  const elements = useProjectStore((s) => s.elements);
  const removeElement = useProjectStore((s) => s.removeElement);

  const moduleElements = useMemo(
    () => elements.filter((e) => e.module === module),
    [elements, module]
  );

  const totals = useMemo(
    () =>
      moduleElements.reduce(
        (acc, el) => {
          acc.concreteM3 += el.concreteM3;
          acc.steelKg += el.steelKg;
          acc.formworkM2 += el.formworkM2;
          return acc;
        },
        { concreteM3: 0, steelKg: 0, formworkM2: 0 }
      ),
    [moduleElements]
  );

  if (moduleElements.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-steel-50 p-4 text-sm text-steel-500">
        <Layers size={16} />
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-steel-200">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="bg-steel-100 text-left text-steel-600">
              <th className="px-3 py-2 font-medium">Elemento</th>
              <th className="px-3 py-2 text-right font-medium">Concreto (m³)</th>
              <th className="px-3 py-2 text-right font-medium">Acero (kg)</th>
              <th className="px-3 py-2 text-right font-medium">Encofrado (m²)</th>
              <th className="px-3 py-2 text-right font-medium no-print">Acción</th>
            </tr>
          </thead>
          <tbody>
            {moduleElements.map((el, idx) => (
              <tr key={el.id} className={idx % 2 === 0 ? "bg-white" : "bg-steel-50"}>
                <td className="px-3 py-2 font-medium text-navy-900">{el.name}</td>
                <td className="px-3 py-2 text-right font-mono">{numberFormatter.format(el.concreteM3)}</td>
                <td className="px-3 py-2 text-right font-mono">{numberFormatter.format(el.steelKg)}</td>
                <td className="px-3 py-2 text-right font-mono">{numberFormatter.format(el.formworkM2)}</td>
                <td className="px-3 py-2 text-right no-print">
                  <button
                    onClick={() => removeElement(el.id)}
                    className="rounded p-1.5 text-steel-500 hover:bg-red-50 hover:text-red-600"
                    aria-label="Eliminar elemento"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-navy-900 bg-steel-100 font-semibold text-navy-900">
              <td className="px-3 py-2">Subtotal ({moduleElements.length})</td>
              <td className="px-3 py-2 text-right font-mono">{numberFormatter.format(totals.concreteM3)}</td>
              <td className="px-3 py-2 text-right font-mono">{numberFormatter.format(totals.steelKg)}</td>
              <td className="px-3 py-2 text-right font-mono">{numberFormatter.format(totals.formworkM2)}</td>
              <td className="no-print" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
