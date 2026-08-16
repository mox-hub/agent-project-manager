import { useQuery, useMutation } from '@tanstack/react-query';
import { githubApi, type GitHubPullRequest } from '../api/github-api';

export const useGithubTestStored = (integrationId: string | undefined) =>
  useQuery({
    queryKey: ['github', 'test', integrationId],
    enabled: !!integrationId,
    queryFn: () => githubApi.testStored(integrationId as string),
  });

export const useGithubSyncLogs = (integrationId: string | undefined, limit = 20) =>
  useQuery({
    queryKey: ['github', 'sync-logs', integrationId, limit],
    enabled: !!integrationId,
    queryFn: () => githubApi.listSyncLogs(integrationId as string, limit),
  });

export const useGithubPulls = (
  integrationId: string | undefined,
  repo: string | undefined,
  state: 'open' | 'closed' | 'all' = 'open',
) =>
  useQuery({
    queryKey: ['github', 'pulls', integrationId, repo, state],
    enabled: !!integrationId && !!repo,
    queryFn: () => githubApi.listPulls(integrationId as string, repo as string, state),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

export const useCreatePull = (integrationId: string) =>
  useMutation({
    mutationFn: (input: { owner: string; repo: string; title: string; head: string; base: string; body?: string; draft?: boolean }) =>
      githubApi.createPull(integrationId, input),
  });
