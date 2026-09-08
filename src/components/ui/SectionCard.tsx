import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, icon, children, className = "" }: SectionCardProps) {
  return (
    <div className={`overflow-hidden rounded-lg border border-steel-200 bg-white shadow-sm transition-shadow hover:shadow-md ${className}`}>
      <div className="flex items-center gap-2.5 border-b-2 border-amber-500/70 bg-steel-50 px-4 py-3">
        {icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-steel-200">
            {icon}
          </span>
        )}
        <h3 className="text-sm font-bold uppercase tracking-wide text-navy-900">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
