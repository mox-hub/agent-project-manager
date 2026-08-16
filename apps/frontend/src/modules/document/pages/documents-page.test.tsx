import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createTestQueryClient } from '@/test-utils/providers';
import { DocumentsPage } from './documents-page';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'document.title': '文档管理',
        'document.description': '管理项目文档、API规范和技术指南',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock useDocuments hook
vi.mock('../hooks/use-documents', () => ({
  useDocuments: vi.fn().mockReturnValue({
    data: [
      { id: '1', title: 'Architecture Overview', category: 'design', status: 'published', updatedAt: new Date().toISOString(), updatedBy: 'admin', currentVersion: 'v1', linkCount: 0 },
      { id: '2', title: 'UI Unification V1', category: 'design', status: 'published', updatedAt: new Date().toISOString(), updatedBy: 'admin', currentVersion: 'v1', linkCount: 0 },
      { id: '3', title: 'Figma Rollout Checklist', category: 'requirement', status: 'draft', updatedAt: new Date().toISOString(), updatedBy: 'admin', currentVersion: 'v1', linkCount: 0 },
    ],
    isLoading: false,
    isError: false,
  }),
}));

// Mock AI identifiers
vi.mock('@/shared/ai/identifiers', () => ({
  CORE_AI_PAGE_IDS: { documents: 'documents' },
}));

// Mock document mutations
vi.mock('../hooks/use-document-mutations', () => ({
  useDeleteDocument: () => ({ mutate: vi.fn() }),
  useCreateDocument: () => ({ mutate: vi.fn() }),
}));

// Mock sync warnings
vi.mock('../hooks/use-sync-warnings', () => ({
  useSyncWarnings: () => ({ data: [] }),
  useClearSyncWarning: () => ({ mutate: vi.fn() }),
}));

describe('DocumentsPage', () => {
  it('renders document list and actions', async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DocumentsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: '文档管理' })).toBeTruthy();
    expect(screen.getByText('Architecture Overview')).toBeTruthy();
    expect(screen.getByText('UI Unification V1')).toBeTruthy();
    expect(screen.getByText('Figma Rollout Checklist')).toBeTruthy();
  });
});
