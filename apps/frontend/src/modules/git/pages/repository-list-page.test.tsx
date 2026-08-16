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
    refetch: vi.fn(),
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
  RepositoryCard: ({ repository }: { repository: { name: string } }) => (
    <div data-testid="repository-card">{repository.name}</div>
  ),
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('RepositoryListPage', () => {
  it('renders repository list with search functionality', async () => {
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <RepositoryListPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Verify heading
    expect(await screen.findByRole('heading', { name: 'Git Repositories' })).toBeTruthy();

    // Verify repository cards are rendered
    expect(screen.getByText('Core API')).toBeTruthy();
    expect(screen.getByText('Mirror Service')).toBeTruthy();

    // Verify search input exists
    const searchInput = screen.getByPlaceholderText('Search repositories...');
    expect(searchInput).toBeTruthy();

    // Type in search - Core API should still be visible, Mirror Service may be filtered
    fireEvent.change(searchInput, { target: { value: 'core' } });

    // After filtering, Core API should still be visible
    expect(screen.getByText('Core API')).toBeTruthy();
  });

  it('shows empty state when no repositories match search', async () => {
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <RepositoryListPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Search for non-existent repository
    fireEvent.change(screen.getByPlaceholderText('Search repositories...'), {
      target: { value: 'nonexistent' },
    });

    // Should show empty state (no repository cards)
    expect(screen.queryByText('Core API')).toBeNull();
    expect(screen.queryByText('Mirror Service')).toBeNull();
  });
});
