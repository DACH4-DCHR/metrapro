import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CalculatedElement } from "../lib/types";

interface ProjectInfo {
  nombreObra: string;
  cliente: string;
  ubicacion: string;
  responsable: string;
  fecha: string;
}

interface ProjectState {
  projectInfo: ProjectInfo;
  elements: CalculatedElement[];
  setProjectInfo: (info: Partial<ProjectInfo>) => void;
  addElement: (el: CalculatedElement) => void;
  removeElement: (id: string) => void;
  clearElements: () => void;
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
      setProjectInfo: (info) =>
        set((state) => ({ projectInfo: { ...state.projectInfo, ...info } })),
      addElement: (el) => set((state) => ({ elements: [el, ...state.elements] })),
      removeElement: (id) =>
        set((state) => ({ elements: state.elements.filter((e) => e.id !== id) })),
      clearElements: () => set({ elements: [] }),
    }),
    { name: "metrados-project-storage" }
  )
);
