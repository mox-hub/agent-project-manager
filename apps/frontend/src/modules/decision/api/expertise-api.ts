import { api } from '@/infrastructure/api-client';

/** 专长度档位（v2 纪要 §2.1）数据层：按 人 × 领域 的解释密度 */

export type ExpertiseDomain = 'requirements' | 'technical' | 'acceptance' | 'process';

export type ExpertiseLevel = 'detailed' | 'terse' | 'suppressed';

export interface ExpertiseDomainState {
  domain: string;
  level: ExpertiseLevel;
  ignoreCount: number;
  updatedAt?: string;
}

export interface ExpertiseResponse {
  domains: ExpertiseDomainState[];
}

export type ExpertiseSignal = 'ignored' | 'asked' | 'suppress' | 'reset';

export const expertiseApi = {
  get: () => api.get<ExpertiseResponse>('/memory/expertise'),

  feedback: (domain: string, signal: ExpertiseSignal, context?: string) =>
    api.post<ExpertiseDomainState>('/memory/expertise/feedback', {
      domain,
      signal,
      ...(context ? { context } : {}),
    }),
};
