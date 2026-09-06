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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API ${path} respondió ${res.status}`);
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
  const res = await fetch(`/api/auth${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Ocurrió un error. Intenta de nuevo.");
  }
  return res.json() as Promise<AuthUser>;
}

export async function authMe(): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me");
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("No se pudo verificar la sesión");
  return res.json() as Promise<AuthUser>;
}

export function authLogin(email: string, password: string): Promise<AuthUser> {
  return authRequest("/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function authRegister(email: string, password: string): Promise<AuthUser> {
  return authRequest("/register", { method: "POST", body: JSON.stringify({ email, password }) });
}

export async function authLogout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}
