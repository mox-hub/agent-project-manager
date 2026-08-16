import { api } from '@/infrastructure/api-client';

export interface CreateProjectData {
  name: string;
  description?: string;
  type?: 'team' | 'personal' | 'enterprise';
  visibility?: 'public' | 'internal' | 'private';
}

export interface OnboardingData {
  projectId?: string;
  repositoryId?: string;
  aiConfigId?: string;
  stepsCompleted: string[];
}

export interface OnboardingResponse {
  id: string;
  completed: boolean;
  currentStep: number;
  data: OnboardingData;
  createdAt: string;
  updatedAt: string;
}

export const onboardingApi = {
  getStatus: () =>
    api.get<OnboardingResponse>('/onboarding/status'),

  createProject: (data: CreateProjectData) =>
    api.post<{ id: string; name: string }>('/onboarding/project', data),

  connectRepository: (data: { repositoryUrl: string; projectId?: string }) =>
    api.post<{ id: string; name: string }>('/onboarding/repository', data),

  configureAi: (data: { provider: string; apiKey?: string; endpoint?: string }) =>
    api.post<{ id: string }>('/onboarding/ai', data),

  finishOnboarding: () =>
    api.post<void>('/onboarding/finish'),

  resetOnboarding: () =>
    api.post<void>('/onboarding/reset'),
};
