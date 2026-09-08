import { useState, type FormEvent } from "react";
import { HardHat, Loader2, Layers3, RectangleVertical, Square, Ruler } from "lucide-react";
import { useAuthStore } from "../store/authStore";

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const ok = mode === "login" ? await login(email, password) : await register(email, password);
    setSubmitting(false);
    if (!ok) return;
  }

  function toggleMode() {
    clearError();
    setMode((m) => (m === "login" ? "register" : "login"));
  }

  return (
    <div className="flex min-h-screen bg-steel-50">
      <div className="relative hidden w-[45%] shrink-0 flex-col justify-between overflow-hidden bg-navy-950 p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-amber-500">
            <HardHat size={24} />
          </div>
          <div>
            <p className="text-lg font-bold leading-tight">MetraPro</p>
            <p className="text-xs leading-tight text-steel-400">Metrados Estructurales</p>
          </div>
        </div>

        <div className="relative">
          <h1 className="mb-4 max-w-md text-3xl font-bold leading-tight">
            Metrados estructurales precisos, en minutos.
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-steel-300">
            Zapatas, columnas, placas, muros, losas y más — con diagramas en vivo y verificación
            automática según la NTE E.060 y E.070.
          </p>

          <div className="mt-8 flex items-center gap-4 text-steel-400">
            <Square size={20} />
            <RectangleVertical size={20} />
            <Layers3 size={20} />
            <Ruler size={20} />
          </div>
        </div>

        <p className="relative text-xs text-steel-500">© {new Date().getFullYear()} MetraPro</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center gap-2 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-amber-500 text-white">
              <HardHat size={26} />
            </div>
            <p className="text-lg font-bold text-navy-900">MetraPro</p>
            <p className="text-sm text-steel-500">Metrados Estructurales</p>
          </div>

          <div className="rounded-lg border border-steel-200 bg-white p-6 shadow-sm">
            <h1 className="mb-1 text-lg font-bold text-navy-900">
              {mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}
            </h1>
            <p className="mb-5 text-sm text-steel-500">
              {mode === "login"
                ? "Accede a tus proyectos de metrados."
                : "Empieza a metrar tus proyectos en minutos."}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-navy-800">Correo electrónico</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-steel-200 bg-white px-3 py-2 text-navy-900 outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-navy-800">Contraseña</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-steel-200 bg-white px-3 py-2 text-navy-900 outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20"
                />
                {mode === "register" && (
                  <span className="text-xs text-steel-500">Mínimo 8 caracteres.</span>
                )}
              </label>

              {error && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-1 flex items-center justify-center gap-2 rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-steel-500">
              {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
              <button onClick={toggleMode} className="font-semibold text-navy-800 hover:underline">
                {mode === "login" ? "Regístrate" : "Inicia sesión"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
