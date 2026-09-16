import { useEffect, useRef, useState } from "react";
import { Building2, ChevronsUpDown, Plus, Trash2, Check, CloudOff, RefreshCw } from "lucide-react";
import { useProjectStore } from "../store/projectStore";

export function ProjectSwitcher() {
  const projects = useProjectStore((s) => s.projects);
  const projectId = useProjectStore((s) => s.projectId);
  const projectInfo = useProjectStore((s) => s.projectInfo);
  const isOffline = useProjectStore((s) => s.isOffline);
  const pendingCount = useProjectStore((s) => s.pendingCount);
  const switchProject = useProjectStore((s) => s.switchProject);
  const createProject = useProjectStore((s) => s.createProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleCreate() {
    setOpen(false);
    await createProject();
  }

  async function handleDelete(id: number, nombre: string) {
    const label = nombre.trim() || "este proyecto";
    if (!window.confirm(`¿Eliminar "${label}"? Se borrarán todos sus elementos, precios y materiales. Esta acción no se puede deshacer.`)) {
      return;
    }
    await deleteProject(id);
  }

  return (
    <div ref={containerRef} className="relative border-b border-white/10 px-3 py-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md border border-white/10 bg-navy-900 px-3 py-2 text-left hover:bg-navy-800"
      >
        <Building2 size={16} className="shrink-0 text-amber-500" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
          {projectInfo.nombreObra || "Proyecto sin nombre"}
        </span>
        <ChevronsUpDown size={14} className="shrink-0 text-steel-400" />
      </button>

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

      {open && (
        <div className="absolute left-3 right-3 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-md border border-navy-700 bg-navy-900 py-1 shadow-xl">
          <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-steel-500">
            Tus proyectos
          </p>
          {projects.map((p) => (
            <div
              key={p.id}
              className={`group flex items-center gap-2 px-2 py-1.5 ${
                p.id === projectId ? "bg-navy-800" : "hover:bg-navy-800"
              }`}
            >
              <button
                onClick={() => {
                  setOpen(false);
                  if (p.id !== projectId) switchProject(p.id);
                }}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span className="flex w-4 shrink-0 justify-center">
                  {p.id === projectId && <Check size={13} className="text-amber-400" />}
                </span>
                <span className="min-w-0 flex-1 truncate text-steel-200">
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
          <div className="mt-1 border-t border-white/10 pt-1">
            <button
              onClick={handleCreate}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-steel-200 hover:bg-navy-800 hover:text-white"
            >
              <Plus size={13} />
              Nuevo proyecto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
