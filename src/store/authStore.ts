import { create } from "zustand";
import { authMe, authLogin, authRegister, authLogout, NetworkError, type AuthUser } from "../lib/api";
import { readCachedAuthUser, writeCachedAuthUser, clearCachedAuthUser, clearOfflineData } from "../lib/offlineCache";

interface AuthState {
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  user: AuthUser | null;
  isOfflineSession: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: "idle",
  user: null,
  isOfflineSession: false,
  error: null,

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

  clearError: () => set({ error: null }),
}));
