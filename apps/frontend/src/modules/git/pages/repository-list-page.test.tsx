import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositoryListPage } from './repository-list-page';

vi.mock('@/shared/confirm/use-confirm', () => ({
  useConfirm: () => async () => true,
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'git.title': 'Git Repositories',
        'git.searchRepositories': 'Search repositories...',
      };
      return translations[key] || key;
    },
  }),
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

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderPage = () =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <RepositoryListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

/** 搜索框在筛选下拉内：先点开工具栏筛选按钮 */
async function openFilterAndSearch() {
  fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
  return screen.findByPlaceholderText('Search repositories...');
}

describe('RepositoryListPage', () => {
  it('renders repository list with search functionality', async () => {
    renderPage();

    // Verify heading
    expect(await screen.findByRole('heading', { name: 'Git Repositories' })).toBeTruthy();

    // Verify repository rows are rendered
    expect(screen.getByText('Core API')).toBeTruthy();
    expect(screen.getByText('Mirror Service')).toBeTruthy();

    // Type in search - Core API should still be visible, Mirror Service may be filtered
    const searchInput = await openFilterAndSearch();
    fireEvent.change(searchInput, { target: { value: 'core' } });

    // After filtering, Core API should still be visible
    expect(screen.getByText('Core API')).toBeTruthy();
  });

  it('shows empty state when no repositories match search', async () => {
    renderPage();

    // Search for non-existent repository（搜索框 300ms 防抖，回车立即提交）
    const searchInput = await openFilterAndSearch();
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    // Should show empty state (no repository rows)
    await waitFor(() => expect(screen.queryByText('Core API')).toBeNull());
    expect(screen.queryByText('Mirror Service')).toBeNull();
  });
});
