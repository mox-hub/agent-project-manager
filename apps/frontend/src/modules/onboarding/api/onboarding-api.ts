import { apiClient } from '@/infrastructure/api-client';

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
    apiClient.get<OnboardingResponse>('/onboarding/status').then((res) => res.data),

  createProject: (data: CreateProjectData) =>
    apiClient.post<{ id: string; name: string }>('/onboarding/project', data).then((res) => res.data),

  connectRepository: (data: { repositoryUrl: string; projectId?: string }) =>
    apiClient.post<{ id: string; name: string }>('/onboarding/repository', data).then((res) => res.data),

  configureAi: (data: { provider: string; apiKey?: string; endpoint?: string }) =>
    apiClient.post<{ id: string }>('/onboarding/ai', data).then((res) => res.data),

  finishOnboarding: () =>
    apiClient.post<{ success: boolean }>('/onboarding/finish').then((res) => res.data),

  resetOnboarding: () =>
    apiClient.post<{ success: boolean }>('/onboarding/reset').then((res) => res.data),
};
