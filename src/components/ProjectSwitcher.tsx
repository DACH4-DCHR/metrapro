import { useEffect, useRef, useState } from "react";
import { Building2, ChevronsUpDown, Plus, Trash2, Check } from "lucide-react";
import { useProjectStore } from "../store/projectStore";

export function ProjectSwitcher() {
  const projects = useProjectStore((s) => s.projects);
  const projectId = useProjectStore((s) => s.projectId);
  const projectInfo = useProjectStore((s) => s.projectInfo);
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
    <div ref={containerRef} className="relative border-t border-white/10 px-4 py-4 text-xs">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-steel-400 hover:bg-navy-800 hover:text-white"
      >
        <Building2 size={14} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{projectInfo.nombreObra || "Proyecto sin nombre"}</span>
        <ChevronsUpDown size={13} className="shrink-0 text-steel-500" />
      </button>

      {open && (
        <div className="absolute bottom-full left-2 right-2 z-50 mb-1 max-h-80 overflow-y-auto rounded-md border border-navy-700 bg-navy-900 py-1 shadow-xl">
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
