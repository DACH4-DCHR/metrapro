import { useState, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";

interface SectionCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function SectionCard({
  title,
  icon,
  children,
  className = "",
  collapsible = false,
  defaultCollapsed = false,
}: SectionCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div
      className={`relative overflow-visible rounded-lg border border-steel-200 bg-white shadow-sm transition-shadow hover:shadow-md ${className}`}
    >
      <div className="flex items-center gap-2.5 rounded-t-lg border-b-2 border-amber-500/70 bg-steel-50 px-4 py-3">
        {icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-steel-200">
            {icon}
          </span>
        )}
        <h3 className="min-w-0 flex-1 truncate text-sm font-bold uppercase tracking-wide text-navy-900">{title}</h3>
        {collapsible && (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? `Expandir ${title}` : `Minimizar ${title}`}
            title={collapsed ? "Expandir" : "Minimizar"}
            className="absolute -right-2.5 -top-2.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-steel-200 bg-navy-900 text-white shadow-md transition-colors hover:bg-navy-700"
          >
            {collapsed ? <Plus size={14} /> : <Minus size={14} />}
          </button>
        )}
      </div>
      <div
        className={`grid overflow-hidden transition-[grid-template-rows] duration-200 ease-in-out ${
          collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
