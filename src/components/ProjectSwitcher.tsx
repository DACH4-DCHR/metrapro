import { useState } from "react";
import { Building2, ChevronDown, Plus, Trash2, Check, CloudOff, RefreshCw } from "lucide-react";
import { useProjectStore } from "../store/projectStore";
import { useCompactViewport } from "../hooks/useCompactViewport";

export function ProjectSwitcher() {
  const projects = useProjectStore((s) => s.projects);
  const projectId = useProjectStore((s) => s.projectId);
  const projectInfo = useProjectStore((s) => s.projectInfo);
  const isOffline = useProjectStore((s) => s.isOffline);
  const pendingCount = useProjectStore((s) => s.pendingCount);
  const switchProject = useProjectStore((s) => s.switchProject);
  const createProject = useProjectStore((s) => s.createProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const compact = useCompactViewport();
  // En poca altura arranca cerrada la lista de proyectos — es lo primero que
  // se puede ocultar sin perder de vista en qué proyecto estás (esa parte de
  // arriba, "Proyecto activo", siempre queda visible).
  const [open, setOpen] = useState(!compact);

  async function handleDelete(id: number, nombre: string) {
    const label = nombre.trim() || "este proyecto";
    if (!window.confirm(`¿Eliminar "${label}"? Se borrarán todos sus elementos, precios y materiales. Esta acción no se puede deshacer.`)) {
      return;
    }
    await deleteProject(id);
  }

  return (
    <div className={`border-b border-white/10 px-3 ${compact ? "py-2" : "py-3"}`}>
      {/* Proyecto activo: siempre visible, fijo, independiente de si la lista está desplegada */}
      <div className="flex items-center gap-2 rounded-md border border-white/10 bg-navy-900 px-3 py-2">
        <Building2 size={16} className="shrink-0 text-amber-500" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
          {projectInfo.nombreObra || "Proyecto sin nombre"}
        </span>
      </div>

      <div className="mt-1.5 px-1 text-[11px]">
        {isOffline ? (
          <div className="flex items-center gap-1.5 text-amber-400">
            <CloudOff size={12} className="shrink-0" />
            <span>
              Sin conexión
              {pendingCount > 0 && ` — ${pendingCount} cambio${pendingCount === 1 ? "" : "s"} pendiente${pendingCount === 1 ? "" : "s"}`}
            </span>
          </div>
        ) : pendingCount > 0 ? (
          <div className="flex items-center gap-1.5 text-steel-300">
            <RefreshCw size={12} className="shrink-0 animate-spin" />
            <span>Sincronizando {pendingCount} cambio{pendingCount === 1 ? "" : "s"}…</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-steel-500">
            <Check size={12} className="shrink-0 text-green-500" />
            <span>Guardado</span>
          </div>
        )}
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-2 flex w-full items-center justify-between rounded-md px-1 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-steel-500 transition-colors hover:bg-navy-800 hover:text-steel-200"
      >
        Proyectos
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
        />
      </button>

      <div
        className={`grid overflow-hidden transition-[grid-template-rows] duration-200 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 space-y-0.5 overflow-hidden pt-1">
          {projects.map((p) => (
            <div
              key={p.id}
              className={`group flex items-center gap-2 rounded-md px-2 py-1.5 ${
                p.id === projectId ? "bg-navy-800" : "hover:bg-navy-800"
              }`}
            >
              <button
                onClick={() => {
                  if (p.id !== projectId) switchProject(p.id);
                }}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span className="flex w-4 shrink-0 justify-center">
                  {p.id === projectId && <Check size={13} className="text-amber-400" />}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-steel-200">
                  {p.nombreObra || "Proyecto sin nombre"}
                </span>
              </button>
              {projects.length > 1 && (
                <button
                  onClick={() => handleDelete(p.id, p.nombreObra)}
                  aria-label="Eliminar proyecto"
                  className="shrink-0 rounded p-1 text-steel-500 opacity-0 hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => createProject()}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-steel-300 hover:bg-navy-800 hover:text-white"
          >
            <Plus size={13} />
            Nuevo proyecto
          </button>
        </div>
      </div>
    </div>
  );
}
