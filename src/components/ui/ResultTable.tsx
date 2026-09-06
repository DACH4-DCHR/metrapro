import type { MetradoLine } from "../../lib/types";

interface ResultTableProps {
  lines: MetradoLine[];
}

const numberFormatter = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 });

export function ResultTable({ lines }: ResultTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-steel-200">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr className="bg-navy-900 text-left text-white">
            <th className="px-4 py-2 font-semibold">Partida</th>
            <th className="px-4 py-2 font-semibold">Unidad</th>
            <th className="px-4 py-2 text-right font-semibold">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, idx) => (
            <tr key={line.partida} className={idx % 2 === 0 ? "bg-white" : "bg-steel-50"}>
              <td className="px-4 py-2 text-navy-900">{line.partida}</td>
              <td className="px-4 py-2 text-steel-600">{line.unidad}</td>
              <td className="px-4 py-2 text-right font-mono font-medium text-navy-900">
                {numberFormatter.format(line.cantidad)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
