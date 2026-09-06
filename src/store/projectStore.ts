import { create } from "zustand";
import type { CalculatedElement } from "../lib/types";
import {
  fetchProject,
  patchProjectInfo,
  putPrices,
  postElement,
  deleteElement as apiDeleteElement,
  NetworkError,
} from "../lib/api";
import {
  readProjectSnapshot,
  writeProjectSnapshot,
  readPendingQueue,
  writePendingQueue,
  pendingCount as computePendingCount,
  emptyQueue,
  type PendingQueue,
} from "../lib/offlineCache";

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
  isOffline: boolean;
  pendingCount: number;
  queue: PendingQueue;
  init: () => Promise<void>;
  reset: () => void;
  clearError: () => void;
  setProjectInfo: (info: Partial<ProjectInfo>) => void;
  addElement: (el: CalculatedElement) => void;
  removeElement: (id: string) => void;
  setPrice: (key: string, value: number) => void;
  flushQueue: () => Promise<void>;
}

const emptyProjectInfo: ProjectInfo = {
  nombreObra: "",
  cliente: "",
  ubicacion: "",
  responsable: "",
  fecha: new Date().toISOString().slice(0, 10),
};

let syncing = false;

export const useProjectStore = create<ProjectState>()((set, get) => {
  function persistSnapshot() {
    const { projectInfo, prices, elements } = get();
    writeProjectSnapshot({ projectInfo, prices, elements });
  }

  function persistQueue(queue: PendingQueue) {
    writePendingQueue(queue);
    set({ queue, pendingCount: computePendingCount(queue) });
  }

  return {
    projectInfo: emptyProjectInfo,
    elements: [],
    prices: {},
    status: "idle",
    error: null,
    isOffline: false,
    pendingCount: 0,
    queue: emptyQueue(),

    init: async () => {
      if (get().status === "loading" || get().status === "ready") return;
      set({ status: "loading", error: null, queue: readPendingQueue() });
      set((state) => ({ pendingCount: computePendingCount(state.queue) }));
      try {
        const data = await fetchProject();
        writeProjectSnapshot(data);
        set({ projectInfo: data.projectInfo, prices: data.prices, elements: data.elements, status: "ready", isOffline: false });
        get().flushQueue();
      } catch (e) {
        if (e instanceof NetworkError) {
          const cached = readProjectSnapshot();
          if (cached) {
            set({
              projectInfo: cached.projectInfo,
              prices: cached.prices,
              elements: cached.elements,
              status: "ready",
              isOffline: true,
            });
            return;
          }
        }
        set({
          status: "error",
          error:
            "No se pudo conectar con el servidor y no hay datos guardados localmente todavía. Verifica tu conexión o que el backend esté corriendo.",
        });
      }
    },

    reset: () => set({ projectInfo: emptyProjectInfo, elements: [], prices: {}, status: "idle", error: null, isOffline: false, pendingCount: 0, queue: emptyQueue() }),

    clearError: () => set({ error: null }),

    setProjectInfo: (info) => {
      set((state) => ({ projectInfo: { ...state.projectInfo, ...info } }));
      persistSnapshot();
      patchProjectInfo(info)
        .then(() => get().flushQueue())
        .catch((e) => {
          if (e instanceof NetworkError) {
            const queue = get().queue;
            persistQueue({ ...queue, projectInfoPatch: { ...(queue.projectInfoPatch ?? {}), ...info } });
            set({ isOffline: true });
          } else {
            set({ error: "No se pudo guardar el cambio en el servidor." });
          }
        });
    },

    addElement: (el) => {
      set((state) => ({ elements: [el, ...state.elements] }));
      persistSnapshot();
      postElement(el)
        .then(() => get().flushQueue())
        .catch((e) => {
          if (e instanceof NetworkError) {
            const queue = get().queue;
            persistQueue({ ...queue, elementOps: [...queue.elementOps, { type: "add", element: el }] });
            set({ isOffline: true });
          } else {
            set({ error: "No se pudo guardar el elemento en el servidor." });
          }
        });
    },

    removeElement: (id) => {
      set((state) => ({ elements: state.elements.filter((e) => e.id !== id) }));
      persistSnapshot();
      apiDeleteElement(id)
        .then(() => get().flushQueue())
        .catch((e) => {
          if (e instanceof NetworkError) {
            const queue = get().queue;
            const pendingAddIdx = queue.elementOps.findIndex((op) => op.type === "add" && op.element.id === id);
            const nextOps =
              pendingAddIdx !== -1
                ? queue.elementOps.filter((_, i) => i !== pendingAddIdx)
                : [...queue.elementOps, { type: "remove" as const, id }];
            persistQueue({ ...queue, elementOps: nextOps });
            set({ isOffline: true });
          } else {
            set({ error: "No se pudo eliminar el elemento en el servidor." });
          }
        });
    },

    setPrice: (key, value) => {
      const nextPrices = { ...get().prices, [key]: value };
      set({ prices: nextPrices });
      persistSnapshot();
      putPrices(nextPrices)
        .then(() => get().flushQueue())
        .catch((e) => {
          if (e instanceof NetworkError) {
            persistQueue({ ...get().queue, prices: nextPrices });
            set({ isOffline: true });
          } else {
            set({ error: "No se pudo guardar el precio en el servidor." });
          }
        });
    },

    flushQueue: async () => {
      if (syncing) return;
      syncing = true;
      try {
        let queue = get().queue;

        if (queue.projectInfoPatch) {
          try {
            await patchProjectInfo(queue.projectInfoPatch);
            queue = { ...queue, projectInfoPatch: null };
            persistQueue(queue);
          } catch (e) {
            if (e instanceof NetworkError) {
              set({ isOffline: true });
              return;
            }
            set({ error: "No se pudieron sincronizar los datos del proyecto pendientes." });
            queue = { ...queue, projectInfoPatch: null };
            persistQueue(queue);
          }
        }

        if (queue.prices) {
          try {
            await putPrices(queue.prices);
            queue = { ...queue, prices: null };
            persistQueue(queue);
          } catch (e) {
            if (e instanceof NetworkError) {
              set({ isOffline: true });
              return;
            }
            set({ error: "No se pudieron sincronizar los precios pendientes." });
            queue = { ...queue, prices: null };
            persistQueue(queue);
          }
        }

        if (queue.elementOps.length > 0) {
          const ops = queue.elementOps;
          let idx = 0;
          for (; idx < ops.length; idx++) {
            const op = ops[idx];
            try {
              if (op.type === "add") {
                await postElement(op.element);
              } else {
                await apiDeleteElement(op.id);
              }
            } catch (e) {
              if (e instanceof NetworkError) break;
              set({ error: "Un cambio pendiente no se pudo sincronizar y fue descartado." });
              continue;
            }
          }
          queue = { ...queue, elementOps: ops.slice(idx) };
          persistQueue(queue);
          set({ isOffline: idx < ops.length });
        } else {
          set({ isOffline: false });
        }
      } finally {
        syncing = false;
      }
    },
  };
});

let syncListenersReady = false;
export function initOfflineSync() {
  if (syncListenersReady || typeof window === "undefined") return;
  syncListenersReady = true;
  window.addEventListener("online", () => {
    useProjectStore.getState().flushQueue();
  });
  setInterval(() => {
    const state = useProjectStore.getState();
    if (state.pendingCount > 0) state.flushQueue();
  }, 20000);
}

initOfflineSync();
