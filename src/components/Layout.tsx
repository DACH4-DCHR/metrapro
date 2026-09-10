import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Layers3,
  RectangleHorizontal,
  MoveUpRight,
  Square,
  StretchHorizontal,
  Rows3,
  GitCommitHorizontal,
  RectangleVertical,
  PanelLeft,
  BrickWall,
  LayoutPanelTop,
  Grid2x2,
  HardHat,
  Building2,
  AlertTriangle,
  X,
  LogOut,
  CloudOff,
  RefreshCw,
  Menu,
  ChevronDown,
} from "lucide-react";
import { useProjectStore } from "../store/projectStore";
import { useAuthStore } from "../store/authStore";

// Orden constructivo/normativo: cimentación primero (de abajo hacia arriba: zapatas,
// cimiento corrido, sobrecimiento, vigas de cimentación), luego la superestructura
// (vigas, losas) y finalmente escaleras. Los módulos de un mismo grupo comparten
// sección visual en el menú.
const dashboardItem = { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true };

const navGroups: { section: string; items: { to: string; label: string; icon: typeof Layers3 }[] }[] = [
  {
    section: "Cimentación",
    items: [
      { to: "/zapatas", label: "Zapatas", icon: Square },
      { to: "/cimiento-corrido", label: "Cimiento Corrido", icon: StretchHorizontal },
      { to: "/sobrecimiento", label: "Sobrecimiento", icon: Rows3 },
      { to: "/vigas-cimentacion", label: "Vigas de Cimentación", icon: GitCommitHorizontal },
    ],
  },
  {
    section: "Elementos Verticales",
    items: [
      { to: "/columnas", label: "Columnas", icon: RectangleVertical },
      { to: "/placas", label: "Placas", icon: PanelLeft },
      { to: "/muros-albanileria", label: "Muros de Albañilería", icon: BrickWall },
    ],
  },
  {
    section: "Superestructura",
    items: [
      { to: "/vigas", label: "Vigas", icon: RectangleHorizontal },
      { to: "/losa-aligerada", label: "Losa Aligerada", icon: Layers3 },
      { to: "/losa-maciza", label: "Losa Maciza", icon: LayoutPanelTop },
      { to: "/escaleras", label: "Escaleras", icon: MoveUpRight },
    ],
  },
  {
    section: "Arquitectura",
    items: [{ to: "/muros-arquitectura", label: "Muros de Arquitectura", icon: Grid2x2 }],
  },
];

export function Layout() {
  const projectInfo = useProjectStore((s) => s.projectInfo);
  const error = useProjectStore((s) => s.error);
  const clearError = useProjectStore((s) => s.clearError);
  const resetProject = useProjectStore((s) => s.reset);
  const isOffline = useProjectStore((s) => s.isOffline);
  const pendingCount = useProjectStore((s) => s.pendingCount);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of navGroups) {
      initial[group.section] = group.items.some((item) => location.pathname.startsWith(item.to));
    }
    // Si ninguna sección contiene la ruta activa (ej. Dashboard), abre la primera por defecto.
    if (!Object.values(initial).some(Boolean)) initial[navGroups[0].section] = true;
    return initial;
  });

  function toggleSection(section: string) {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    await logout();
    resetProject();
  }

  return (
    <div className="flex min-h-screen bg-steel-50">
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-navy-950 text-white transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500">
            <HardHat size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">MetraPro</p>
            <p className="text-[11px] leading-tight text-steel-400">Metrados Estructurales</p>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
            className="ml-auto rounded p-1.5 text-steel-300 hover:bg-navy-800 hover:text-white md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          <NavLink
            to={dashboardItem.to}
            end={dashboardItem.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md border-l-2 py-2.5 pl-[10px] pr-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-amber-500 bg-navy-800 text-white"
                  : "border-transparent text-steel-300 hover:bg-navy-800 hover:text-white"
              }`
            }
          >
            <dashboardItem.icon size={18} />
            {dashboardItem.label}
          </NavLink>

          {navGroups.map((group) => {
            const isOpen = openSections[group.section] ?? false;
            return (
              <div key={group.section}>
                <button
                  onClick={() => toggleSection(group.section)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-steel-500 transition-colors hover:bg-navy-800 hover:text-steel-200"
                >
                  {group.section}
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${isOpen ? "rotate-0" : "-rotate-90"}`}
                  />
                </button>
                <div
                  className={`grid overflow-hidden transition-[grid-template-rows] duration-200 ease-in-out ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="min-h-0 space-y-1 overflow-hidden pt-1">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={false}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-md border-l-2 py-2.5 pl-[10px] pr-3 text-sm font-medium transition-colors ${
                            isActive
                              ? "border-amber-500 bg-navy-800 text-white"
                              : "border-transparent text-steel-300 hover:bg-navy-800 hover:text-white"
                          }`
                        }
                      >
                        <item.icon size={18} />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-4 py-4 text-xs text-steel-400">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="shrink-0" />
            <span className="truncate">{projectInfo.nombreObra || "Sin obra configurada"}</span>
          </div>
        </div>

        {(isOffline || pendingCount > 0) && (
          <div className="border-t border-white/10 px-4 py-3 text-xs">
            {isOffline ? (
              <div className="flex items-center gap-2 text-amber-400">
                <CloudOff size={14} className="shrink-0" />
                <span>
                  Sin conexión
                  {pendingCount > 0 && ` — ${pendingCount} cambio${pendingCount === 1 ? "" : "s"} pendiente${pendingCount === 1 ? "" : "s"}`}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-steel-300">
                <RefreshCw size={14} className="shrink-0 animate-spin" />
                <span>Sincronizando {pendingCount} cambio{pendingCount === 1 ? "" : "s"}…</span>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-white/10 px-4 py-3">
          <div className="mb-2 truncate text-xs text-steel-400">{user?.email}</div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-steel-300 hover:bg-navy-800 hover:text-white"
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="no-print flex items-center gap-3 border-b border-steel-200 bg-navy-950 px-4 py-3 text-white md:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            className="rounded p-1.5 hover:bg-navy-800"
          >
            <Menu size={20} />
          </button>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500">
            <HardHat size={16} />
          </div>
          <p className="text-sm font-bold">MetraPro</p>
        </div>

        <main className="min-w-0 flex-1">
          {error && (
            <div className="no-print flex items-center justify-between gap-3 bg-red-50 px-6 py-2 text-sm text-red-700">
              <span className="flex items-center gap-2">
                <AlertTriangle size={16} />
                {error}
              </span>
              <button onClick={clearError} aria-label="Cerrar aviso" className="rounded p-1 hover:bg-red-100">
                <X size={14} />
              </button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
