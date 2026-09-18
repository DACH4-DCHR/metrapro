import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  subLabel?: string;
  icon: ReactNode;
  accent?: "navy" | "steel" | "amber" | "dark";
}

const iconStyles: Record<NonNullable<StatCardProps["accent"]>, string> = {
  navy: "bg-navy-900 text-white",
  steel: "bg-steel-700 text-white",
  amber: "bg-amber-500 text-white",
  dark: "bg-white/10 text-amber-400",
};

export function StatCard({ label, value, unit, subLabel, icon, accent = "navy" }: StatCardProps) {
  const isDark = accent === "dark";
  return (
    <div
      className={`flex items-center gap-4 rounded-lg border p-4 shadow-sm ${
        isDark ? "border-navy-950 bg-navy-950" : "border-steel-200 bg-white"
      }`}
    >
      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg ${iconStyles[accent]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p
          className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-steel-300" : "text-steel-500"}`}
        >
          {label}
        </p>
        <p className={`truncate text-2xl font-extrabold ${isDark ? "text-white" : "text-navy-900"}`}>
          {value} {unit && <span className="text-sm font-medium text-steel-500">{unit}</span>}
        </p>
        {subLabel && (
          <p className={`text-xs font-medium ${isDark ? "text-steel-300" : "text-steel-500"}`}>{subLabel}</p>
        )}
      </div>
    </div>
  );
}
