import type { CalculatedElement } from "./types";
import type { AuthUser, ProjectDto } from "./api";

const PROJECT_SNAPSHOT_KEY = "metrapro:project-snapshot";
const PENDING_QUEUE_KEY = "metrapro:pending-queue";
const AUTH_USER_KEY = "metrapro:auth-user";

export type ElementOp = { type: "add"; element: CalculatedElement } | { type: "remove"; id: string };

export interface PendingQueue {
  projectInfoPatch: Record<string, unknown> | null;
  prices: Record<string, number> | null;
  elementOps: ElementOp[];
}

export function emptyQueue(): PendingQueue {
  return { projectInfoPatch: null, prices: null, elementOps: [] };
}

export function pendingCount(queue: PendingQueue): number {
  return (queue.projectInfoPatch ? 1 : 0) + (queue.prices ? 1 : 0) + queue.elementOps.length;
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

export function readProjectSnapshot(): ProjectDto | null {
  return readJson<ProjectDto>(PROJECT_SNAPSHOT_KEY);
}

export function writeProjectSnapshot(data: ProjectDto) {
  writeJson(PROJECT_SNAPSHOT_KEY, data);
}

export function readPendingQueue(): PendingQueue {
  return readJson<PendingQueue>(PENDING_QUEUE_KEY) ?? emptyQueue();
}

export function writePendingQueue(queue: PendingQueue) {
  writeJson(PENDING_QUEUE_KEY, queue);
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
  localStorage.removeItem(PROJECT_SNAPSHOT_KEY);
  localStorage.removeItem(PENDING_QUEUE_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}
