import type { DomainCatalogEntry, RoadmapView, User } from '@pytho-trainer/shared';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new ApiError(response.status, body?.error?.message ?? `Request to ${path} failed`);
  }

  return response.json() as Promise<T>;
}

export function getUser(): Promise<User> {
  return request<User>('/api/user');
}

export function getDomainCatalog(): Promise<DomainCatalogEntry[]> {
  return request<DomainCatalogEntry[]>('/api/domains/catalog');
}

export interface OnboardingPayload {
  goals: string;
  selfAssessedLevel: string;
  diagnosticNotes: Record<string, unknown>;
  selectedDomains: string[];
}

export function submitOnboarding(payload: OnboardingPayload): Promise<User> {
  return request<User>('/api/onboarding', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createCurriculum(): Promise<{ curriculumId: string }> {
  return request<{ curriculumId: string }>('/api/curricula', { method: 'POST' });
}

export function getRoadmap(): Promise<RoadmapView> {
  return request<RoadmapView>('/api/roadmap');
}
