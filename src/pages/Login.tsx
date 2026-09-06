import { useState, type FormEvent } from "react";
import { HardHat, Loader2 } from "lucide-react";
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
    <div className="flex min-h-screen items-center justify-center bg-steel-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
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
  );
}
