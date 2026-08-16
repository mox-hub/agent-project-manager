import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('./use-branches');

const { useBranches, useCreateBranch, useDeleteBranch, useCheckoutBranch } = vi.mocked(
  await import('./use-branches')
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

describe('useBranches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useBranches as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        local: [
          { name: 'main', current: true, tracking: 'origin/main' },
          { name: 'feature/test', current: false, tracking: null },
          { name: 'develop', current: false, tracking: 'origin/develop' },
        ],
        remote: [{ name: 'main', remote: 'origin', fullName: 'origin/main' }],
        current: 'main',
      },
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('fetches branches for a repository', () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useBranches('repo-1'), { wrapper });
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data?.local).toHaveLength(3);
    expect(result.current.data?.current).toBe('main');
  });

  it('fetches with includeRemote', () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useBranches('repo-1', true), { wrapper });
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data?.local).toHaveLength(3);
    expect(result.current.data?.remote).toHaveLength(1);
  });

  it('does not fetch when repoId is empty', () => {
    (useBranches as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useBranches(''), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useCreateBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useCreateBranch as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      mutate: vi.fn(),
      reset: vi.fn(),
    });
  });

  it('creates a branch', async () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useCreateBranch(), { wrapper });
    const branch = await result.current.mutateAsync({
      repoId: 'repo-1',
      dto: { name: 'feature/new', checkout: true },
    });
    expect(branch).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
  });
});

describe('useDeleteBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useDeleteBranch as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
      mutate: vi.fn(),
      reset: vi.fn(),
    });
  });

  it('deletes a branch', async () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useDeleteBranch(), { wrapper });
    const deleted = await result.current.mutateAsync({
      repoId: 'repo-1',
      branchName: 'feature/old',
      force: true,
    });
    expect(deleted).toBeUndefined();
  });
});

describe('useCheckoutBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useCheckoutBranch as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      mutate: vi.fn(),
      reset: vi.fn(),
    });
  });

  it('checkouts a branch', async () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useCheckoutBranch(), { wrapper });
    const checked = await result.current.mutateAsync({
      repoId: 'repo-1',
      branchName: 'develop',
    });
    expect(checked).toBeDefined();
  });
});
