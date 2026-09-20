import { api } from '@/infrastructure/api-client';
import type { RequestBodyOf } from '@/infrastructure/api-client/contract';

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  merged: boolean;
  mergedAt: string | null;
  htmlUrl: string;
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  user: { login: string; id: number; avatarUrl?: string };
  createdAt: string;
  updatedAt: string;
}

export interface GitHubRepoSummary {
  name: string;
  fullName: string;
  defaultBranch: string;
}

export interface GitHubViewer {
  login: string;
  id: number;
  name: string | null;
  email: string | null;
  avatarUrl: string;
  scopes?: string[];
}

export interface GitHubTestInlineResult {
  ok: boolean;
  viewer?: GitHubViewer;
  scopes?: string[];
  sampleRepo?: GitHubRepoSummary;
  error?: string;
}

export interface GitHubPullRequestRecord {
  id: string;
  provider: string;
  externalId: string;
  number: number;
  title: string;
  repoFullName: string;
  state: string;
  isMerged: boolean;
  mergedAt: string | null;
  closedAt: string | null;
  htmlUrl: string;
  headBranch: string | null;
  baseBranch: string | null;
  agentId: string | null;
  projectId: string | null;
  integrationId: string;
  updatedAt: string;
}

/**
 * 请求体单源于契约 TestInlineDto（token/webhookSecret 二选一）；调用方仍传
 * token 字符串，字面量经 satisfies 对照契约校验。
 */
export type GitHubTestInlineRequest =
  RequestBodyOf<'GitHubController_testInline'>;

/** V3 阶段2: GitHub Integration API client (轻量化) */
export const githubApi = {
  testInline: (token: string) =>
    api
      .post<GitHubTestInlineResult>(
        '/integrations/github/test-inline',
        { token } satisfies GitHubTestInlineRequest,
      )
      .then((r) => r),

  testStored: (integrationId: string) =>
    api
      .get<{ ok: boolean; viewer?: GitHubViewer; error?: string }>(
        `/integrations/github/test/${integrationId}`,
      )
      .then((r) => r),

  listSyncLogs: (integrationId: string, limit = 20) =>
    api
      .get<unknown[]>(`/integrations/github/${integrationId}/sync-logs?limit=${limit}`)
      .then((r) => (Array.isArray(r) ? r : [])),

  listPulls: (integrationId: string, repo: string, state: 'open' | 'closed' | 'all' = 'open') =>
    api
      .get<GitHubPullRequest[]>(
        `/integrations/github/${integrationId}/pulls?repo=${encodeURIComponent(repo)}&state=${state}`,
      )
      .then((r) => Array.isArray(r) ? r : []),

  createPull: (
    integrationId: string,
    input: { owner: string; repo: string; title: string; head: string; base: string; body?: string; draft?: boolean },
  ) =>
    api.post<{ ok: boolean; pr?: { number: number; htmlUrl: string; state: string; title: string; merged: boolean } }>(
      `/integrations/github/${integrationId}/pulls`,
      input,
    ),
};

export const useGithubTestInline = () => ({
  mutate: (token: string) => githubApi.testInline(token),
});
