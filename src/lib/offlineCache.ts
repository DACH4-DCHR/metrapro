import type { CalculatedElement } from "./types";
import type { AuthUser, ProjectDto, ProjectListItem } from "./api";
import type { CustomMaterialLine } from "./materiales";
import type { PresupuestoCustomLine } from "./presupuesto";

const NAMESPACE = "metrapro:";
const PROJECT_SNAPSHOT_PREFIX = `${NAMESPACE}project-snapshot:`;
const PENDING_QUEUE_PREFIX = `${NAMESPACE}pending-queue:`;
const AUTH_USER_KEY = `${NAMESPACE}auth-user`;
const ACTIVE_PROJECT_ID_KEY = `${NAMESPACE}active-project-id`;
const PROJECTS_LIST_KEY = `${NAMESPACE}projects-list`;

export type ElementOp = { type: "add"; element: CalculatedElement } | { type: "remove"; id: string };

export interface PendingQueue {
  projectInfoPatch: Record<string, unknown> | null;
  prices: Record<string, number> | null;
  materialesCustom: CustomMaterialLine[] | null;
  presupuestoCustom: PresupuestoCustomLine[] | null;
  elementOps: ElementOp[];
}

export function emptyQueue(): PendingQueue {
  return { projectInfoPatch: null, prices: null, materialesCustom: null, presupuestoCustom: null, elementOps: [] };
}

export function pendingCount(queue: PendingQueue): number {
  return (
    (queue.projectInfoPatch ? 1 : 0) +
    (queue.prices ? 1 : 0) +
    (queue.materialesCustom ? 1 : 0) +
    (queue.presupuestoCustom ? 1 : 0) +
    queue.elementOps.length
  );
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // almacenamiento lleno o no disponible: el snapshot/cola offline son solo una ayuda,
    // no una fuente de verdad, así que se ignora silenciosamente.
  }
}

// El snapshot y la cola pendiente se guardan por proyecto (cada obra tiene su
// propia copia local), para que cambiar de proyecto sin conexión no mezcle ni
// pierda los datos de otro.
export function readProjectSnapshot(projectId: number): ProjectDto | null {
  return readJson<ProjectDto>(`${PROJECT_SNAPSHOT_PREFIX}${projectId}`);
}

export function writeProjectSnapshot(projectId: number, data: ProjectDto) {
  writeJson(`${PROJECT_SNAPSHOT_PREFIX}${projectId}`, data);
}

export function readPendingQueue(projectId: number): PendingQueue {
  return readJson<PendingQueue>(`${PENDING_QUEUE_PREFIX}${projectId}`) ?? emptyQueue();
}

export function writePendingQueue(projectId: number, queue: PendingQueue) {
  writeJson(`${PENDING_QUEUE_PREFIX}${projectId}`, queue);
}

export function readActiveProjectId(): number | null {
  return readJson<number>(ACTIVE_PROJECT_ID_KEY);
}

export function writeActiveProjectId(projectId: number) {
  writeJson(ACTIVE_PROJECT_ID_KEY, projectId);
}

export function readProjectsListCache(): ProjectListItem[] | null {
  return readJson<ProjectListItem[]>(PROJECTS_LIST_KEY);
}

export function writeProjectsListCache(list: ProjectListItem[]) {
  writeJson(PROJECTS_LIST_KEY, list);
}

export function readCachedAuthUser(): AuthUser | null {
  return readJson<AuthUser>(AUTH_USER_KEY);
}

export function writeCachedAuthUser(user: AuthUser) {
  writeJson(AUTH_USER_KEY, user);
}

export function clearCachedAuthUser() {
  localStorage.removeItem(AUTH_USER_KEY);
}

export function clearOfflineData() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(NAMESPACE)) localStorage.removeItem(key);
    }
  } catch {
    // almacenamiento no disponible: no hay nada que limpiar.
  }
}
