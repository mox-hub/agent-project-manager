import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('./use-commits');

const { useCommits, useCommit, useCommitFiles } = vi.mocked(
  await import('./use-commits')
);

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useCommits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useCommits as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        data: [{ id: 'commit-1', repoId: 'repo-1', hash: 'abc123def456', authorName: 'Test User', authorDate: '2026-03-20T00:00:00Z', message: 'Initial commit' }],
        total: 1,
        page: 1,
        pageSize: 20,
      },
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('returns commit data for a repository', () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useCommits('repo-1', { page: 1, pageSize: 20 }), { wrapper });
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].hash).toBe('abc123def456');
  });

  it('passes pagination params', () => {
    (useCommits as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        data: [],
        total: 0,
        page: 2,
        pageSize: 10,
      },
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useCommits('repo-1', { page: 2, pageSize: 10 }), { wrapper });
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data?.page).toBe(2);
  });

  it('does not fetch when repoId is empty', () => {
    (useCommits as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useCommits(''), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useCommit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useCommit as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        id: 'commit-1',
        repoId: 'repo-1',
        hash: 'abc123def456',
        authorName: 'Test User',
        authorDate: '2026-03-20T00:00:00Z',
        message: 'Test commit',
        files: [
          { id: 'file-1', commitId: 'commit-1', path: 'src/index.ts', status: 'modified', additions: 5, deletions: 2 },
        ],
      },
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
    });
  });

  it('returns single commit by id', () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useCommit('commit-1'), { wrapper });
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data?.id).toBe('commit-1');
    expect(result.current.data?.files?.[0].path).toBe('src/index.ts');
  });
});

describe('useCommitFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useCommitFiles as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        { id: 'file-1', commitId: 'commit-1', path: 'src/index.ts', status: 'modified', additions: 5, deletions: 2 },
        { id: 'file-2', commitId: 'commit-1', path: 'README.md', status: 'added', additions: 10, deletions: 0 },
      ],
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
    });
  });

  it('extracts files from commit', () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useCommitFiles('commit-1'), { wrapper });
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].path).toBe('src/index.ts');
    expect(result.current.data?.[0].additions).toBe(5);
  });

  it('returns empty array when commit has no files', () => {
    (useCommitFiles as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
    });
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useCommitFiles('commit-empty'), { wrapper });
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toHaveLength(0);
  });
});
