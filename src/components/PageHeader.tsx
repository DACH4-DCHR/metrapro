import { useState, type ReactNode } from "react";
import { Sparkles, ChevronDown } from "lucide-react";
import { HELP_CONTENT, type HelpKey } from "../lib/helpContent";
import { useHelpStore } from "../store/helpStore";
import { useCompactViewport } from "../hooks/useCompactViewport";

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
  const hasActionsRow = hasHelp || actions;
  const compact = useCompactViewport();
  // En poca altura (celular en horizontal) arranca contraído — ahí es donde
  // esta barra "sticky" realmente estorba. En cualquier otro caso arranca
  // expandida, como siempre.
  const [expanded, setExpanded] = useState(!compact);

  return (
    <div
      className={`no-print sticky top-0 z-10 flex flex-col gap-2 bg-navy-950 px-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 ${
        compact ? "py-2" : "py-3 sm:py-5"
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className={`flex shrink-0 items-center justify-center rounded-lg bg-amber-500 text-navy-950 shadow-[0_0_0_3px_rgba(217,140,43,0.25)] ${
            compact ? "h-7 w-7" : "h-8 w-8 sm:h-11 sm:w-11"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-white sm:text-lg">{title}</h1>
          {subtitle && expanded && <p className="hidden text-sm text-steel-400 sm:block">{subtitle}</p>}
        </div>
        {hasActionsRow && (
          <button
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? "Contraer encabezado" : "Expandir encabezado"}
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-steel-400 hover:bg-white/10 hover:text-white"
          >
            <ChevronDown size={18} className={`transition-transform ${expanded ? "" : "rotate-180"}`} />
          </button>
        )}
      </div>
      {hasActionsRow && (
        <div className={`flex-wrap items-center gap-2 ${expanded ? "flex" : "hidden"}`}>
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
