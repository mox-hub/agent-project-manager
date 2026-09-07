import { api } from '@/infrastructure/api-client';

/**
 * 剧本运行态（v2 纪要切片 4）数据层：形状对齐 server PlaybookController DTO。
 */

export type PlaybookAudience = 'novice' | 'maintenance';

export interface PlaybookInterviewQuestion {
  id: string;
  question: string;
  hint?: string;
  required: boolean;
  term?: string;
  termNote?: string;
}

export interface PlaybookStageTemplate {
  key: string;
  name: string;
  purpose: string;
  domain: string;
  interview: PlaybookInterviewQuestion[];
  document: { titleTemplate: string; category: string; intro: string; numbered?: boolean };
  gate: { title: string; detail: string; consequences: string[] };
}

export interface PlaybookTemplate {
  key: string;
  name: string;
  description: string;
  audience: PlaybookAudience;
  stages: PlaybookStageTemplate[];
}

export interface PlaybookTemplatesResponse {
  version: string;
  templates: PlaybookTemplate[];
}

export type PlaybookStageStatusValue = 'done' | 'active' | 'pending' | 'skipped';

export interface PlaybookStageStatus {
  key: string;
  name: string;
  purpose: string;
  status: PlaybookStageStatusValue;
  completedAt?: string;
  skippedAt?: string;
  skippedReason?: string;
  documentId?: string;
  documentTitle?: string;
  gateProposalId?: string;
  gateStatus?: 'pending' | 'accepted' | 'rejected';
  gateRejections: number;
}

export interface PlaybookStatusResponse {
  projectId: string;
  playbookRef: string | null;
  template: { key: string; name: string; description: string } | null;
  currentStage: string | null;
  stages: PlaybookStageStatus[];
}

export interface GlossaryMapping {
  questionId: string;
  question: string;
  answerExcerpt: string;
  term?: string;
  termNote?: string;
}

export interface SubmitInterviewResponse {
  documentId: string;
  documentTitle: string;
  proposalId: string;
  mappings: GlossaryMapping[];
}

export const playbookApi = {
  getTemplates: () => api.get<PlaybookTemplatesResponse>('/playbooks/templates'),

  getStatus: (projectId: string) =>
    api.get<PlaybookStatusResponse>(`/projects/${projectId}/playbook`),

  mount: (projectId: string, playbookRef: string) =>
    api.post<PlaybookStatusResponse>(`/projects/${projectId}/playbook/mount`, {
      playbookRef,
    }),

  submitInterview: (
    projectId: string,
    stageKey: string,
    answers: Array<{ questionId: string; answer: string }>,
  ) =>
    api.post<SubmitInterviewResponse>(
      `/projects/${projectId}/playbook/stages/${stageKey}/interview`,
      { answers },
    ),

  skipStage: (projectId: string, stageKey: string, reason?: string) =>
    api.post<{ skippedStage: string; currentStage: string | null }>(
      `/projects/${projectId}/playbook/stages/${stageKey}/skip`,
      { reason },
    ),
};
