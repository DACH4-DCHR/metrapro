import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, icon, children, className = "" }: SectionCardProps) {
  return (
    <div className={`rounded-lg border border-steel-200 bg-white shadow-sm ${className}`}>
      <div className="flex items-center gap-2 border-b border-steel-100 bg-steel-50 px-4 py-3">
        {icon}
        <h3 className="text-sm font-semibold uppercase tracking-wide text-navy-800">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
