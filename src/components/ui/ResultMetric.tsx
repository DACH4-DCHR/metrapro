import type { ReactNode } from "react";

const numberFormatter = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 4 });

interface ResultMetricProps {
  label: string;
  value: number;
  unit: string;
  icon?: ReactNode;
  accent?: "navy" | "steel" | "amber";
}

const accentStyles: Record<NonNullable<ResultMetricProps["accent"]>, string> = {
  navy: "border-navy-700/25 bg-navy-700/[0.06]",
  steel: "border-steel-400/40 bg-steel-500/[0.06]",
  amber: "border-amber-500/40 bg-amber-500/10",
};

export function ResultMetric({ label, value, unit, icon, accent = "steel" }: ResultMetricProps) {
  return (
    <div className={`flex items-start gap-2 rounded-md border p-3 ${accentStyles[accent]}`}>
      {icon && <span className="mt-0.5 shrink-0 text-steel-500">{icon}</span>}
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-steel-500">{label}</p>
        <p className="truncate text-lg font-bold leading-tight text-navy-900">
          {numberFormatter.format(value)} <span className="text-xs font-medium text-steel-500">{unit}</span>
        </p>
      </div>
    </div>
  );
}
