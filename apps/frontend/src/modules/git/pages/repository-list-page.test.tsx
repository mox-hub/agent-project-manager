import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositoryListPage } from './repository-list-page';

vi.mock('@/shared/confirm/use-confirm', () => ({
  useConfirm: () => async () => true,
}));

vi.mock('@/modules/git/hooks/use-git-tool', () => ({
  useGitToolStatus: () => ({ data: { available: true, version: '2.40.0' }, isLoading: false }),
}));

vi.mock('@/modules/project/hooks/use-project-list', () => ({
  useProjectList: () => ({ data: undefined, isLoading: false }),
}));

vi.mock('@/components/ui/native-select', () => ({
  NativeSelect: ({
    value,
    onChange,
    children,
  }: {
    value: string;
    onChange: (event: { target: { value: string } }) => void;
    children: ReactNode;
  }) => (
    <select value={value} onChange={onChange}>
      {children}
    </select>
  ),
  NativeSelectOption: ({
    value,
    children,
  }: {
    value: string;
    children: ReactNode;
  }) => <option value={value}>{children}</option>,
}));

vi.mock('../hooks/use-repositories', () => ({
  useRepositories: () => ({
    data: [
      {
        id: 'repo-1',
        projectId: 'p1',
        name: 'Core API',
        provider: 'github',
        localPath: 'E:/core-api',
        remoteUrl: 'git@github.com:team/core-api.git',
        defaultBranch: 'main',
        createdAt: '2026-03-20T00:00:00Z',
        updatedAt: '2026-03-21T00:00:00Z',
      },
      {
        id: 'repo-2',
        projectId: 'p1',
        name: 'Mirror Service',
        provider: 'gitlab',
        localPath: 'E:/mirror-service',
        remoteUrl: 'git@gitlab.com:team/mirror-service.git',
        defaultBranch: 'develop',
        createdAt: '2026-03-20T00:00:00Z',
        updatedAt: '2026-03-21T00:00:00Z',
      },
    ],
    isLoading: false,
  }),
  useDeleteRepository: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateRepository: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('../components/repository-card', () => ({
  RepositoryCard: ({ repository }: { repository: { name: string } }) => <div>{repository.name}</div>,
}));

vi.mock('../components/repository-list', () => ({
  RepositoryList: ({
    provider,
    query,
  }: {
    provider?: string;
    query?: string;
  }) => <div data-testid="repository-list-filters">{`${provider}|${query}`}</div>,
}));

describe('RepositoryListPage', () => {
  it('applies search filter to repository content', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <RepositoryListPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Git Repositories' })).toBeTruthy();
    expect(screen.getByText('Core API')).toBeTruthy();
    expect(screen.getByText('Mirror Service')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Search repositories...'), {
      target: { value: 'core' },
    });
    expect(screen.getByText('Core API')).toBeTruthy();
    expect(screen.queryByText('Mirror Service')).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('Search repositories...'), {
      target: { value: 'mirror' },
    });
    expect(screen.getByText('Mirror Service')).toBeTruthy();
    expect(screen.queryByText('Core API')).toBeNull();
  });
});
