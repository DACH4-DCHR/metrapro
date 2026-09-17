import { create } from "zustand";
import {
  authMe,
  authLogin,
  authRegister,
  authLogout,
  authForgotPassword,
  authResetPassword,
  NetworkError,
  type AuthUser,
} from "../lib/api";
import { readCachedAuthUser, writeCachedAuthUser, clearCachedAuthUser, clearOfflineData } from "../lib/offlineCache";

interface AuthState {
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  user: AuthUser | null;
  isOfflineSession: boolean;
  error: string | null;
  // Confirmaciones (no errores) de acciones puntuales, ej. "revisa tu correo"
  // tras pedir recuperar la contraseña.
  message: string | null;
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (token: string, password: string) => Promise<boolean>;
  clearError: () => void;
  clearMessage: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: "idle",
  user: null,
  isOfflineSession: false,
  error: null,
  message: null,

  checkAuth: async () => {
    set({ status: "loading" });
    try {
      const user = await authMe();
      if (user) {
        writeCachedAuthUser(user);
        set({ user, status: "authenticated", isOfflineSession: false });
      } else {
        clearCachedAuthUser();
        set({ user: null, status: "unauthenticated", isOfflineSession: false });
      }
    } catch (e) {
      if (e instanceof NetworkError) {
        const cached = readCachedAuthUser();
        if (cached) {
          set({ user: cached, status: "authenticated", isOfflineSession: true });
          return;
        }
      }
      set({ status: "unauthenticated", user: null, isOfflineSession: false });
    }
  },

  login: async (email, password) => {
    set({ error: null });
    try {
      const user = await authLogin(email, password);
      writeCachedAuthUser(user);
      set({ user, status: "authenticated", isOfflineSession: false });
      return true;
    } catch (e) {
      const message =
        e instanceof NetworkError
          ? "No hay conexión con el servidor. Necesitas iniciar sesión al menos una vez con internet."
          : e instanceof Error
            ? e.message
            : "No se pudo iniciar sesión";
      set({ error: message });
      return false;
    }
  },

  register: async (email, password) => {
    set({ error: null });
    try {
      const user = await authRegister(email, password);
      writeCachedAuthUser(user);
      set({ user, status: "authenticated", isOfflineSession: false });
      return true;
    } catch (e) {
      const message =
        e instanceof NetworkError
          ? "No hay conexión con el servidor. Necesitas crear tu cuenta con internet la primera vez."
          : e instanceof Error
            ? e.message
            : "No se pudo crear la cuenta";
      set({ error: message });
      return false;
    }
  },

  logout: async () => {
    await authLogout();
    clearOfflineData();
    set({ user: null, status: "unauthenticated", isOfflineSession: false });
  },

  forgotPassword: async (email) => {
    set({ error: null, message: null });
    try {
      await authForgotPassword(email);
      set({
        message:
          "Si ese correo tiene una cuenta, te enviamos un enlace para recuperar tu contraseña. Si no lo ves en unos minutos, revisa tu carpeta de Spam o Promociones.",
      });
      return true;
    } catch (e) {
      const message =
        e instanceof NetworkError
          ? "No hay conexión con el servidor."
          : e instanceof Error
            ? e.message
            : "No se pudo procesar la solicitud.";
      set({ error: message });
      return false;
    }
  },

  resetPassword: async (token, password) => {
    set({ error: null, message: null });
    try {
      await authResetPassword(token, password);
      set({ message: "Tu contraseña se actualizó. Ya puedes iniciar sesión con la nueva." });
      return true;
    } catch (e) {
      const message =
        e instanceof NetworkError
          ? "No hay conexión con el servidor."
          : e instanceof Error
            ? e.message
            : "No se pudo actualizar la contraseña.";
      set({ error: message });
      return false;
    }
  },

  clearError: () => set({ error: null }),
  clearMessage: () => set({ message: null }),
}));
