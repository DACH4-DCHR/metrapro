import type { CalculatedElement } from "./types";

export interface ProjectInfoDto {
  id?: number;
  nombreObra: string;
  cliente: string;
  ubicacion: string;
  responsable: string;
  fecha: string;
  logoDataUrl?: string;
}

export interface ProjectDto {
  projectInfo: ProjectInfoDto;
  prices: Record<string, number>;
  elements: CalculatedElement[];
}

export class NetworkError extends Error {
  constructor() {
    super("No hay conexión con el servidor");
    this.name = "NetworkError";
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// 502/503/504: el proxy (Vite en dev, o un reverse proxy en producción) no pudo
// alcanzar el backend. Es una falla de conectividad, no un rechazo de la API.
const GATEWAY_ERROR_STATUSES = new Set([502, 503, 504]);

async function doFetch(path: string, options?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new NetworkError();
  }
  if (GATEWAY_ERROR_STATUSES.has(res.status)) {
    throw new NetworkError();
  }
  return res;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await doFetch(path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || `API ${path} respondió ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

export function fetchProject(): Promise<ProjectDto> {
  return request<ProjectDto>("/project");
}

export function patchProjectInfo(fields: Partial<ProjectInfoDto>): Promise<ProjectDto> {
  return request<ProjectDto>("/project", { method: "PATCH", body: JSON.stringify(fields) });
}

export function putPrices(prices: Record<string, number>): Promise<ProjectDto> {
  return request<ProjectDto>("/project/prices", { method: "PUT", body: JSON.stringify(prices) });
}

export function postElement(element: CalculatedElement): Promise<ProjectDto> {
  return request<ProjectDto>("/project/elements", { method: "POST", body: JSON.stringify(element) });
}

export function deleteElement(id: string): Promise<ProjectDto> {
  return request<ProjectDto>(`/project/elements/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export interface AuthUser {
  id: number;
  email: string;
}

async function authRequest(path: string, options?: RequestInit): Promise<AuthUser> {
  const res = await doFetch(`/auth${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || "Ocurrió un error. Intenta de nuevo.", res.status);
  }
  return res.json() as Promise<AuthUser>;
}

export async function authMe(): Promise<AuthUser | null> {
  const res = await doFetch("/auth/me");
  if (res.status === 401) return null;
  if (!res.ok) throw new ApiError("No se pudo verificar la sesión", res.status);
  return res.json() as Promise<AuthUser>;
}

export function authLogin(email: string, password: string): Promise<AuthUser> {
  return authRequest("/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function authRegister(email: string, password: string): Promise<AuthUser> {
  return authRequest("/register", { method: "POST", body: JSON.stringify({ email, password }) });
}

export async function authLogout(): Promise<void> {
  try {
    await doFetch("/auth/logout", { method: "POST" });
  } catch {
    // si no hay conexión, la sesión local se limpia igual; el servidor expirará la cookie por sí solo
  }
}
