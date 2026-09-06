import { create } from "zustand";
import { authMe, authLogin, authRegister, authLogout, type AuthUser } from "../lib/api";

interface AuthState {
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  user: AuthUser | null;
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
  error: null,

  checkAuth: async () => {
    set({ status: "loading" });
    try {
      const user = await authMe();
      set({ user, status: user ? "authenticated" : "unauthenticated" });
    } catch {
      set({ status: "unauthenticated", user: null });
    }
  },

  login: async (email, password) => {
    set({ error: null });
    try {
      const user = await authLogin(email, password);
      set({ user, status: "authenticated" });
      return true;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "No se pudo iniciar sesión" });
      return false;
    }
  },

  register: async (email, password) => {
    set({ error: null });
    try {
      const user = await authRegister(email, password);
      set({ user, status: "authenticated" });
      return true;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "No se pudo crear la cuenta" });
      return false;
    }
  },

  logout: async () => {
    await authLogout();
    set({ user: null, status: "unauthenticated" });
  },

  clearError: () => set({ error: null }),
}));
