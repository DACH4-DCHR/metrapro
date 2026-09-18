import { useState, type ReactNode } from "react";
import { Sparkles, ChevronDown } from "lucide-react";
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
  const hasActionsRow = hasHelp || actions;
  // Expandido por defecto. En celular en horizontal, el título + botones de
  // esta barra (que es "sticky", siempre visible) llegan a tapar casi media
  // pantalla — y ese caso tiene el ANCHO de un celular normal (así que un
  // breakpoint de ancho tipo "sm:hidden" no lo distingue de un monitor
  // angosto). Por eso el botón de contraer va siempre visible, en cualquier
  // tamaño: no estorba en escritorio y resuelve el caso real en mobile.
  const [expanded, setExpanded] = useState(true);

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
