import { create } from "zustand";
import type { CalculatedElement } from "../lib/types";
import {
  fetchProject,
  patchProjectInfo,
  putPrices,
  postElement,
  deleteElement as apiDeleteElement,
} from "../lib/api";

interface ProjectInfo {
  nombreObra: string;
  cliente: string;
  ubicacion: string;
  responsable: string;
  fecha: string;
  logoDataUrl?: string;
}

interface ProjectState {
  projectInfo: ProjectInfo;
  elements: CalculatedElement[];
  prices: Record<string, number>;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  init: () => Promise<void>;
  reset: () => void;
  clearError: () => void;
  setProjectInfo: (info: Partial<ProjectInfo>) => void;
  addElement: (el: CalculatedElement) => void;
  removeElement: (id: string) => void;
  setPrice: (key: string, value: number) => void;
}

const emptyProjectInfo: ProjectInfo = {
  nombreObra: "",
  cliente: "",
  ubicacion: "",
  responsable: "",
  fecha: new Date().toISOString().slice(0, 10),
};

export const useProjectStore = create<ProjectState>()((set, get) => ({
  projectInfo: emptyProjectInfo,
  elements: [],
  prices: {},
  status: "idle",
  error: null,

  init: async () => {
    if (get().status === "loading" || get().status === "ready") return;
    set({ status: "loading", error: null });
    try {
      const data = await fetchProject();
      set({ projectInfo: data.projectInfo, prices: data.prices, elements: data.elements, status: "ready" });
    } catch {
      set({
        status: "error",
        error: "No se pudo conectar con el servidor. Verifica que el backend esté corriendo (npm run dev en /server).",
      });
    }
  },

  reset: () => set({ projectInfo: emptyProjectInfo, elements: [], prices: {}, status: "idle", error: null }),

  clearError: () => set({ error: null }),

  setProjectInfo: (info) => {
    set((state) => ({ projectInfo: { ...state.projectInfo, ...info } }));
    patchProjectInfo(info).catch(() => {
      set({ error: "No se pudo guardar el cambio en el servidor." });
    });
  },

  addElement: (el) => {
    set((state) => ({ elements: [el, ...state.elements] }));
    postElement(el).catch(() => {
      set({ error: "No se pudo guardar el elemento en el servidor." });
    });
  },

  removeElement: (id) => {
    set((state) => ({ elements: state.elements.filter((e) => e.id !== id) }));
    apiDeleteElement(id).catch(() => {
      set({ error: "No se pudo eliminar el elemento en el servidor." });
    });
  },

  setPrice: (key, value) => {
    const nextPrices = { ...get().prices, [key]: value };
    set({ prices: nextPrices });
    putPrices(nextPrices).catch(() => {
      set({ error: "No se pudo guardar el precio en el servidor." });
    });
  },
}));
