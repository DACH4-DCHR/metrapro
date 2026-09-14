import { create } from "zustand";
import type { HelpKey } from "../lib/helpContent";

interface HelpState {
  openKey: HelpKey | null;
  open: (key: HelpKey) => void;
  close: () => void;
}

// Estado global (no por página) para el panel de ayuda: vive en Layout, junto al
// contenido principal, para que abrirlo empuje el layout (como la barra lateral)
// en vez de taparlo con un overlay — por eso no puede ser un useState local de
// PageHeader, que está anidado dentro del área que se necesita achicar.
export const useHelpStore = create<HelpState>((set) => ({
  openKey: null,
  open: (key) => set({ openKey: key }),
  close: () => set({ openKey: null }),
}));
