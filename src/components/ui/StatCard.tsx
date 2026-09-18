import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  subLabel?: string;
  subLabelColor?: string;
  icon: ReactNode;
  accentColor: string;
}

export function StatCard({ label, value, subLabel, subLabelColor, icon, accentColor }: StatCardProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-navy-800 bg-navy-950 py-4 pl-4 pr-5"
      style={{ borderLeftWidth: 4, borderLeftColor: accentColor }}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white lg:h-14 lg:w-14"
        style={{ backgroundColor: accentColor }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-extrabold uppercase tracking-wide text-steel-300">{label}</p>
        <p className="truncate text-2xl font-extrabold text-white">{value}</p>
        {subLabel && (
          <p className="mt-0.5 truncate text-xs font-bold" style={{ color: subLabelColor ?? accentColor }}>
            {subLabel}
          </p>
        )}
      </div>
    </div>
  );
}
