import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, icon, actions }: PageHeaderProps) {
  return (
    <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-steel-200 bg-white px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-navy-900 text-white">
          {icon}
        </div>
        <div>
          <h1 className="text-lg font-bold text-navy-900">{title}</h1>
          {subtitle && <p className="text-sm text-steel-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
