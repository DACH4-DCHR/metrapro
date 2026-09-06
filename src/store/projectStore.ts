import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CalculatedElement } from "../lib/types";

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
  setProjectInfo: (info: Partial<ProjectInfo>) => void;
  addElement: (el: CalculatedElement) => void;
  removeElement: (id: string) => void;
  clearElements: () => void;
  setPrice: (key: string, value: number) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projectInfo: {
        nombreObra: "",
        cliente: "",
        ubicacion: "",
        responsable: "",
        fecha: new Date().toISOString().slice(0, 10),
      },
      elements: [],
      prices: {},
      setProjectInfo: (info) =>
        set((state) => ({ projectInfo: { ...state.projectInfo, ...info } })),
      addElement: (el) => set((state) => ({ elements: [el, ...state.elements] })),
      removeElement: (id) =>
        set((state) => ({ elements: state.elements.filter((e) => e.id !== id) })),
      clearElements: () => set({ elements: [] }),
      setPrice: (key, value) => set((state) => ({ prices: { ...state.prices, [key]: value } })),
    }),
    { name: "metrados-project-storage" }
  )
);
