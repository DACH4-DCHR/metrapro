import { useState, type FormEvent } from "react";
import { HardHat, Loader2 } from "lucide-react";
import { useAuthStore } from "../store/authStore";

// Página independiente del resto de la app (no requiere sesión) — se llega
// acá desde el enlace del correo de recuperación, con el token en la URL.
export function ResetPasswordPage() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const error = useAuthStore((s) => s.error);
  const message = useAuthStore((s) => s.message);
  const resetPassword = useAuthStore((s) => s.resetPassword);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (password !== confirmPassword) {
      setLocalError("Las contraseñas no coinciden.");
      return;
    }
    setSubmitting(true);
    await resetPassword(token, password);
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-steel-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-amber-500 text-white">
            <HardHat size={26} />
          </div>
          <p className="text-lg font-bold text-navy-900">MetraPro</p>
        </div>

        <div className="rounded-lg border border-steel-200 bg-white p-6 shadow-sm">
          <h1 className="mb-1 text-lg font-bold text-navy-900">Elige tu nueva contraseña</h1>
          <p className="mb-5 text-sm text-steel-500">Este enlace vale por 1 hora desde que lo recibiste.</p>

          {!token ? (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              Este enlace no es válido. Solicita uno nuevo desde la pantalla de inicio de sesión.
            </div>
          ) : message ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>
              <a
                href="/"
                className="flex items-center justify-center rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-700"
              >
                Ir a iniciar sesión
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-navy-800">Nueva contraseña</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-steel-200 bg-white px-3 py-2 text-navy-900 outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20"
                />
                <span className="text-xs text-steel-500">Mínimo 8 caracteres.</span>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-navy-800">Confirmar contraseña</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border border-steel-200 bg-white px-3 py-2 text-navy-900 outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20"
                />
              </label>

              {(localError || error) && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{localError || error}</div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-1 flex items-center justify-center gap-2 rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Guardar nueva contraseña
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
