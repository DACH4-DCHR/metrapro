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
  Shovel,
  HardHat,
  AlertTriangle,
  X,
  LogOut,
  Menu,
  ChevronDown,
  MessageCircle,
  Mail,
  Send,
  Phone,
} from "lucide-react";
import { useProjectStore } from "../store/projectStore";
import { useAuthStore } from "../store/authStore";
import { useHelpStore } from "../store/helpStore";
import { HELP_CONTENT } from "../lib/helpContent";
import { HelpPanel } from "./ui/HelpPanel";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { whatsappLink, telegramLink, mailtoLink } from "../lib/contact";

// Orden constructivo/normativo: movimiento de tierras primero (excavación previa a
// cualquier vaciado), luego cimentación (de abajo hacia arriba: zapatas, cimiento
// corrido, sobrecimiento, vigas de cimentación), luego la superestructura (vigas,
// losas) y finalmente escaleras. Los módulos de un mismo grupo comparten sección
// visual en el menú.
const dashboardItem = { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true };

const navGroups: { section: string; items: { to: string; label: string; icon: typeof Layers3 }[] }[] = [
  {
    section: "Movimiento de Tierras",
    items: [{ to: "/movimiento-tierras", label: "Movimiento de Tierras", icon: Shovel }],
  },
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

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Botón "Enviar" con menú desplegable (WhatsApp/Telegram/Correo) para los
// avisos de prueba vencida/por vencer y renovación de actualizaciones — sin
// esto, "contáctanos" era solo texto sin ningún lugar a donde escribir.
function ContactLinks({ message, subject, className }: { message: string; subject: string; className: string }) {
  const [open, setOpen] = useState(false);

  const options = [
    { label: "WhatsApp", icon: MessageCircle, href: whatsappLink(message), external: true },
    { label: "Telegram", icon: Send, href: telegramLink(), external: true },
    { label: "Correo", icon: Mail, href: mailtoLink(subject, message), external: false },
  ];

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-80 ${className}`}
      >
        <Phone size={14} />
        Contactar
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <span className="absolute left-0 top-full z-50 mt-1 flex min-w-[140px] flex-col gap-0.5 rounded-md border border-steel-200 bg-white p-1.5 text-sm font-normal text-navy-900 shadow-lg">
            {options.map((opt) => (
              <a
                key={opt.label}
                href={opt.href}
                target={opt.external ? "_blank" : undefined}
                rel={opt.external ? "noopener noreferrer" : undefined}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-steel-100"
              >
                <opt.icon size={14} />
                {opt.label}
              </a>
            ))}
          </span>
        </>
      )}
    </span>
  );
}

export function Layout() {
  const error = useProjectStore((s) => s.error);
  const clearError = useProjectStore((s) => s.clearError);
  const resetProject = useProjectStore((s) => s.reset);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const diasRestantesPrueba =
    user && !user.isPaid ? Math.ceil((user.trialEndsAt - Date.now()) / MS_POR_DIA) : null;
  // Solo un aviso — a diferencia del banner de prueba vencida, esto nunca
  // bloquea nada: la cuenta pagada sigue funcionando igual, es solo una
  // invitación a renovar para seguir recibiendo actualizaciones.
  const avisoActualizaciones = user?.isPaid && user.updatesReminderDue;
  const [menuOpen, setMenuOpen] = useState(false);
  const helpKey = useHelpStore((s) => s.openKey);
  const closeHelp = useHelpStore((s) => s.close);
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
    closeHelp();
  }, [location.pathname, closeHelp]);

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

        <ProjectSwitcher />

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

        <div className="flex min-w-0 flex-1">
          <main className="min-w-0 flex-1">
            {diasRestantesPrueba !== null && diasRestantesPrueba <= 0 && (
              <div className="no-print flex flex-wrap items-center gap-x-2 gap-y-1 bg-red-600 px-6 py-2 text-sm font-medium text-white">
                <AlertTriangle size={16} />
                <span>
                  Tu período de prueba de 14 días terminó. Tu cuenta está en modo de solo lectura — puedes ver y
                  exportar tus proyectos, pero no crear ni editar nada nuevo.
                </span>
                <ContactLinks
                  message={`Hola, mi prueba de MetraPro terminó y quiero activar mi cuenta (${user?.email ?? ""}).`}
                  subject="Activar cuenta MetraPro"
                  className="text-white"
                />
              </div>
            )}
            {diasRestantesPrueba !== null && diasRestantesPrueba > 0 && diasRestantesPrueba <= 3 && (
              <div className="no-print flex flex-wrap items-center gap-x-2 gap-y-1 bg-amber-100 px-6 py-2 text-sm font-medium text-amber-900">
                <AlertTriangle size={16} />
                <span>
                  Tu prueba gratuita termina en {diasRestantesPrueba} {diasRestantesPrueba === 1 ? "día" : "días"}.
                  Actívala ahora para no perder acceso.
                </span>
                <ContactLinks
                  message={`Hola, mi prueba de MetraPro termina en ${diasRestantesPrueba} ${diasRestantesPrueba === 1 ? "día" : "días"} y quiero activar mi cuenta (${user?.email ?? ""}).`}
                  subject="Activar cuenta MetraPro"
                  className="text-amber-900"
                />
              </div>
            )}
            {avisoActualizaciones && (
              <div className="no-print flex flex-wrap items-center gap-x-2 gap-y-1 bg-blue-50 px-6 py-2 text-sm font-medium text-blue-800">
                <AlertTriangle size={16} />
                <span>Ya pasó un año desde que activaste tu cuenta. Hay actualizaciones nuevas disponibles.</span>
                <ContactLinks
                  message={`Hola, quiero renovar mi cuenta de MetraPro para seguir recibiendo actualizaciones (${user?.email ?? ""}).`}
                  subject="Renovar cuenta MetraPro"
                  className="text-blue-800"
                />
              </div>
            )}
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
          {helpKey && HELP_CONTENT[helpKey] && (
            <HelpPanel content={HELP_CONTENT[helpKey]} onClose={closeHelp} />
          )}
        </div>
      </div>
    </div>
  );
}
