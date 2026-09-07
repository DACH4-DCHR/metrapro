import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, icon, actions }: PageHeaderProps) {
  return (
    <div className="no-print sticky top-0 z-10 flex flex-col gap-3 border-b border-steel-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-900 text-white">
          {icon}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-navy-900">{title}</h1>
          {subtitle && <p className="hidden text-sm text-steel-500 sm:block">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
