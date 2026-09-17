import { create } from "zustand";
import type { CalculatedElement } from "../lib/types";
import type { CustomMaterialLine } from "../lib/materiales";
import type { PresupuestoCustomLine } from "../lib/presupuesto";
import {
  fetchProject,
  patchProjectInfo,
  putPrices,
  putMaterialesCustom,
  putPresupuestoCustom,
  postElement,
  deleteElement as apiDeleteElement,
  listProjects,
  createProject as apiCreateProject,
  deleteProject as apiDeleteProject,
  NetworkError,
  type ProjectListItem,
} from "../lib/api";
import {
  readProjectSnapshot,
  writeProjectSnapshot,
  readPendingQueue,
  writePendingQueue,
  readActiveProjectId,
  writeActiveProjectId,
  readProjectsListCache,
  writeProjectsListCache,
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
  projectId: number | null;
  projects: ProjectListItem[];
  projectInfo: ProjectInfo;
  elements: CalculatedElement[];
  prices: Record<string, number>;
  materialesCustom: CustomMaterialLine[];
  presupuestoCustom: PresupuestoCustomLine[];
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  isOffline: boolean;
  pendingCount: number;
  queue: PendingQueue;
  init: () => Promise<void>;
  reset: () => void;
  clearError: () => void;
  switchProject: (projectId: number) => Promise<void>;
  createProject: () => Promise<void>;
  deleteProject: (projectId: number) => Promise<void>;
  setProjectInfo: (info: Partial<ProjectInfo>) => void;
  addElement: (el: CalculatedElement) => void;
  removeElement: (id: string) => void;
  setPrice: (key: string, value: number) => void;
  setMaterialesCustom: (items: CustomMaterialLine[]) => void;
  setPresupuestoCustom: (items: PresupuestoCustomLine[]) => void;
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
    const { projectId, projectInfo, prices, materialesCustom, presupuestoCustom, elements } = get();
    if (projectId == null) return;
    writeProjectSnapshot(projectId, { projectInfo, prices, materialesCustom, presupuestoCustom, elements });
  }

  function persistQueue(queue: PendingQueue) {
    const projectId = get().projectId;
    if (projectId != null) writePendingQueue(projectId, queue);
    set({ queue, pendingCount: computePendingCount(queue) });
  }

  // Carga los datos de un proyecto puntual (ya elegido) y los deja como el
  // proyecto activo: recuerda el id para la próxima vez, lee su cola pendiente
  // propia, y si no hay conexión cae al snapshot local de ESE proyecto.
  async function loadProject(projectId: number) {
    writeActiveProjectId(projectId);
    const queue = readPendingQueue(projectId);
    set({ projectId, queue, pendingCount: computePendingCount(queue) });
    try {
      const data = await fetchProject(projectId);
      writeProjectSnapshot(projectId, data);
      set({
        projectInfo: data.projectInfo,
        prices: data.prices,
        materialesCustom: data.materialesCustom ?? [],
        presupuestoCustom: data.presupuestoCustom ?? [],
        elements: data.elements,
        status: "ready",
        error: null,
        isOffline: false,
      });
      get().flushQueue();
    } catch (e) {
      if (e instanceof NetworkError) {
        const cached = readProjectSnapshot(projectId);
        if (cached) {
          set({
            projectInfo: cached.projectInfo,
            prices: cached.prices,
            materialesCustom: cached.materialesCustom ?? [],
            presupuestoCustom: cached.presupuestoCustom ?? [],
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
  }

  return {
    projectId: null,
    projects: [],
    projectInfo: emptyProjectInfo,
    elements: [],
    prices: {},
    materialesCustom: [],
    presupuestoCustom: [],
    status: "idle",
    error: null,
    isOffline: false,
    pendingCount: 0,
    queue: emptyQueue(),

    init: async () => {
      if (get().status === "loading" || get().status === "ready") return;
      set({ status: "loading", error: null });
      try {
        const list = await listProjects();
        writeProjectsListCache(list);
        set({ projects: list });
        const storedId = readActiveProjectId();
        const targetId = list.some((p) => p.id === storedId) ? (storedId as number) : list[0]?.id;
        if (targetId == null) {
          // No debería pasar (todo usuario nace con un proyecto), pero por si acaso.
          const created = await apiCreateProject();
          const newId = created.projectInfo.id as number;
          const refreshedList = await listProjects();
          writeProjectsListCache(refreshedList);
          set({ projects: refreshedList });
          await loadProject(newId);
          return;
        }
        await loadProject(targetId);
      } catch (e) {
        if (e instanceof NetworkError) {
          const cachedList = readProjectsListCache();
          const storedId = readActiveProjectId();
          if (cachedList && cachedList.length > 0) {
            const targetId = cachedList.some((p) => p.id === storedId) ? (storedId as number) : cachedList[0].id;
            const cachedSnap = readProjectSnapshot(targetId);
            if (cachedSnap) {
              const queue = readPendingQueue(targetId);
              set({
                projects: cachedList,
                projectId: targetId,
                projectInfo: cachedSnap.projectInfo,
                prices: cachedSnap.prices,
                materialesCustom: cachedSnap.materialesCustom ?? [],
                presupuestoCustom: cachedSnap.presupuestoCustom ?? [],
                elements: cachedSnap.elements,
                queue,
                pendingCount: computePendingCount(queue),
                status: "ready",
                isOffline: true,
              });
              return;
            }
          }
        }
        set({
          status: "error",
          error:
            "No se pudo conectar con el servidor y no hay datos guardados localmente todavía. Verifica tu conexión o que el backend esté corriendo.",
        });
      }
    },

    reset: () =>
      set({
        projectId: null,
        projects: [],
        projectInfo: emptyProjectInfo,
        elements: [],
        prices: {},
        materialesCustom: [],
        presupuestoCustom: [],
        status: "idle",
        error: null,
        isOffline: false,
        pendingCount: 0,
        queue: emptyQueue(),
      }),

    clearError: () => set({ error: null }),

    switchProject: async (projectId) => {
      if (get().projectId === projectId) return;
      set({ status: "loading", error: null });
      await loadProject(projectId);
    },

    createProject: async () => {
      try {
        const data = await apiCreateProject();
        const newId = data.projectInfo.id as number;
        const list = await listProjects();
        writeProjectsListCache(list);
        set({ projects: list, status: "loading", error: null });
        await loadProject(newId);
      } catch (e) {
        set({
          error:
            e instanceof NetworkError
              ? "No se puede crear un proyecto nuevo sin conexión."
              : "No se pudo crear el proyecto.",
        });
      }
    },

    deleteProject: async (projectId) => {
      try {
        const list = await apiDeleteProject(projectId);
        writeProjectsListCache(list);
        set({ projects: list });
        if (get().projectId === projectId) {
          const next = list[0];
          if (next) {
            set({ status: "loading" });
            await loadProject(next.id);
          }
        }
      } catch (e) {
        set({
          error:
            e instanceof NetworkError
              ? "No se puede eliminar un proyecto sin conexión."
              : "No se pudo eliminar el proyecto.",
        });
      }
    },

    setProjectInfo: (info) => {
      const projectId = get().projectId;
      if (projectId == null) return;
      set((state) => ({ projectInfo: { ...state.projectInfo, ...info } }));
      persistSnapshot();
      // El selector de proyectos muestra nombreObra/cliente/fecha desde la lista en caché,
      // no desde projectInfo — sin esto, renombrar la obra activa no se reflejaría ahí
      // hasta la próxima vez que se recargue la lista completa (crear/borrar un proyecto).
      if ("nombreObra" in info || "cliente" in info || "fecha" in info) {
        set((state) => {
          const projects = state.projects.map((p) => (p.id === projectId ? { ...p, ...info } : p));
          writeProjectsListCache(projects);
          return { projects };
        });
      }
      patchProjectInfo(projectId, info)
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
      const projectId = get().projectId;
      if (projectId == null) return;
      set((state) => ({ elements: [el, ...state.elements] }));
      persistSnapshot();
      postElement(projectId, el)
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
      const projectId = get().projectId;
      if (projectId == null) return;
      set((state) => ({ elements: state.elements.filter((e) => e.id !== id) }));
      persistSnapshot();
      apiDeleteElement(projectId, id)
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
      const projectId = get().projectId;
      if (projectId == null) return;
      const nextPrices = { ...get().prices, [key]: value };
      set({ prices: nextPrices });
      persistSnapshot();
      putPrices(projectId, nextPrices)
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

    setMaterialesCustom: (items) => {
      const projectId = get().projectId;
      if (projectId == null) return;
      set({ materialesCustom: items });
      persistSnapshot();
      putMaterialesCustom(projectId, items)
        .then(() => get().flushQueue())
        .catch((e) => {
          if (e instanceof NetworkError) {
            persistQueue({ ...get().queue, materialesCustom: items });
            set({ isOffline: true });
          } else {
            set({ error: "No se pudo guardar el material en el servidor." });
          }
        });
    },

    setPresupuestoCustom: (items) => {
      const projectId = get().projectId;
      if (projectId == null) return;
      set({ presupuestoCustom: items });
      persistSnapshot();
      putPresupuestoCustom(projectId, items)
        .then(() => get().flushQueue())
        .catch((e) => {
          if (e instanceof NetworkError) {
            persistQueue({ ...get().queue, presupuestoCustom: items });
            set({ isOffline: true });
          } else {
            set({ error: "No se pudo guardar la partida en el servidor." });
          }
        });
    },

    flushQueue: async () => {
      if (syncing) return;
      const projectId = get().projectId;
      if (projectId == null) return;
      syncing = true;
      try {
        let queue = get().queue;

        if (queue.projectInfoPatch) {
          try {
            await patchProjectInfo(projectId, queue.projectInfoPatch);
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
            await putPrices(projectId, queue.prices);
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

        if (queue.materialesCustom) {
          try {
            await putMaterialesCustom(projectId, queue.materialesCustom);
            queue = { ...queue, materialesCustom: null };
            persistQueue(queue);
          } catch (e) {
            if (e instanceof NetworkError) {
              set({ isOffline: true });
              return;
            }
            set({ error: "No se pudieron sincronizar los materiales pendientes." });
            queue = { ...queue, materialesCustom: null };
            persistQueue(queue);
          }
        }

        if (queue.presupuestoCustom) {
          try {
            await putPresupuestoCustom(projectId, queue.presupuestoCustom);
            queue = { ...queue, presupuestoCustom: null };
            persistQueue(queue);
          } catch (e) {
            if (e instanceof NetworkError) {
              set({ isOffline: true });
              return;
            }
            set({ error: "No se pudieron sincronizar las partidas pendientes." });
            queue = { ...queue, presupuestoCustom: null };
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
                await postElement(projectId, op.element);
              } else {
                await apiDeleteElement(projectId, op.id);
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
