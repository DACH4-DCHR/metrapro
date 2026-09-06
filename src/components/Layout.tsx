import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Layers3,
  RectangleHorizontal,
  MoveUpRight,
  HardHat,
  Building2,
  AlertTriangle,
  X,
  LogOut,
} from "lucide-react";
import { useProjectStore } from "../store/projectStore";
import { useAuthStore } from "../store/authStore";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/losa-aligerada", label: "Losa Aligerada", icon: Layers3, end: false },
  { to: "/vigas", label: "Vigas", icon: RectangleHorizontal, end: false },
  { to: "/escaleras", label: "Escaleras", icon: MoveUpRight, end: false },
];

export function Layout() {
  const projectInfo = useProjectStore((s) => s.projectInfo);
  const error = useProjectStore((s) => s.error);
  const clearError = useProjectStore((s) => s.clearError);
  const resetProject = useProjectStore((s) => s.reset);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  async function handleLogout() {
    await logout();
    resetProject();
  }

  return (
    <div className="flex min-h-screen bg-steel-50">
      <aside className="no-print flex w-64 shrink-0 flex-col bg-navy-950 text-white">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-500">
            <HardHat size={20} />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">MetraPro</p>
            <p className="text-[11px] leading-tight text-steel-400">Metrados Estructurales</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-navy-700 text-white"
                    : "text-steel-300 hover:bg-navy-800 hover:text-white"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-4 text-xs text-steel-400">
          <div className="flex items-center gap-2">
            <Building2 size={14} />
            <span className="truncate">{projectInfo.nombreObra || "Sin obra configurada"}</span>
          </div>
        </div>

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

      <main className="flex-1 overflow-x-hidden">
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
  );
}
