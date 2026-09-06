import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  icon: ReactNode;
  accent?: "navy" | "steel" | "amber";
}

const accentStyles: Record<NonNullable<StatCardProps["accent"]>, string> = {
  navy: "bg-navy-900 text-white",
  steel: "bg-steel-700 text-white",
  amber: "bg-amber-500 text-white",
};

export function StatCard({ label, value, unit, icon, accent = "navy" }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-steel-200 bg-white p-4 shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${accentStyles[accent]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-steel-500">{label}</p>
        <p className="truncate text-xl font-bold text-navy-900">
          {value} {unit && <span className="text-sm font-medium text-steel-500">{unit}</span>}
        </p>
      </div>
    </div>
  );
}
