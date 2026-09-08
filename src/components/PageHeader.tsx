import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, icon, actions }: PageHeaderProps) {
  return (
    <div className="no-print sticky top-0 z-10 flex flex-col gap-3 bg-navy-950 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-navy-950 shadow-[0_0_0_3px_rgba(217,140,43,0.25)]">
          {icon}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-white">{title}</h1>
          {subtitle && <p className="hidden text-sm text-steel-400 sm:block">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
