import type { ReactNode } from "react";

const numberFormatter = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 4 });

interface ResultMetricProps {
  label: string;
  value: number;
  unit: string;
  icon?: ReactNode;
  accent?: "navy" | "steel" | "amber";
}

const accentBorder: Record<NonNullable<ResultMetricProps["accent"]>, string> = {
  navy: "border-l-navy-700",
  steel: "border-l-steel-500",
  amber: "border-l-amber-500",
};

export function ResultMetric({ label, value, unit, icon, accent = "steel" }: ResultMetricProps) {
  return (
    <div className={`flex items-start gap-2 rounded-md border-l-4 bg-steel-50 p-3 ${accentBorder[accent]}`}>
      {icon && <span className="mt-0.5 shrink-0 text-steel-400">{icon}</span>}
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-steel-500">{label}</p>
        <p className="truncate text-base font-bold text-navy-900">
          {numberFormatter.format(value)} <span className="text-xs font-medium text-steel-500">{unit}</span>
        </p>
      </div>
    </div>
  );
}
