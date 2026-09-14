import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { HELP_CONTENT, type HelpKey } from "../lib/helpContent";
import { useHelpStore } from "../store/helpStore";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  actions?: ReactNode;
  helpKey?: HelpKey;
}

export function PageHeader({ title, subtitle, icon, actions, helpKey }: PageHeaderProps) {
  const openHelp = useHelpStore((s) => s.open);
  const hasHelp = Boolean(helpKey && HELP_CONTENT[helpKey]);

  return (
    <div className="no-print sticky top-0 z-10 flex flex-col gap-2 bg-navy-950 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-navy-950 shadow-[0_0_0_3px_rgba(217,140,43,0.25)] sm:h-11 sm:w-11">
          {icon}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-white sm:text-lg">{title}</h1>
          {subtitle && <p className="hidden text-sm text-steel-400 sm:block">{subtitle}</p>}
        </div>
      </div>
      {(hasHelp || actions) && (
        <div className="flex flex-wrap items-center gap-2">
          {hasHelp && (
            <button
              onClick={() => openHelp(helpKey!)}
              aria-label="Guía rápida: cómo llenar este módulo"
              title="Guía rápida: cómo llenar este módulo"
              className="help-button-glow flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-navy-950 shadow-sm transition-colors hover:bg-amber-400"
            >
              <Sparkles size={16} />
              <span className="hidden sm:inline">Guía rápida</span>
            </button>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}
