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

export function deleteAllElements(): Promise<ProjectDto> {
  return request<ProjectDto>("/project/elements", { method: "DELETE" });
}
