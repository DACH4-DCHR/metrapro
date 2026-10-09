// Fila de Gastos Generales / Utilidad / IGV del presupuesto: checkbox para
// incluirla o dejarla de lado, porcentaje editable, y el monto resultante.
export function BudgetLineRow({
  label,
  checked,
  onCheckedChange,
  pct,
  onPctChange,
  monto,
  currencyFormatter,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  pct: number;
  onPctChange: (pct: number) => void;
  monto: number;
  currencyFormatter: Intl.NumberFormat;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="flex items-center gap-2 text-sm text-navy-800">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-600"
        />
        {label}
      </label>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="0.1"
            min={0}
            value={pct}
            disabled={!checked}
            onChange={(e) => onPctChange(Number(e.target.value) || 0)}
            className="w-16 rounded border border-steel-200 px-2 py-1 text-right font-mono text-navy-900 outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20 disabled:bg-steel-50 disabled:text-steel-400"
          />
          <span className="text-xs text-steel-500">%</span>
        </div>
        <span className={`w-28 text-right font-mono text-sm ${checked ? "text-navy-900" : "text-steel-400"}`}>
          {currencyFormatter.format(monto)}
        </span>
      </div>
    </div>
  );
}
