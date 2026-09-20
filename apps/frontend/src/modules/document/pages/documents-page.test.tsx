import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTestQueryClient } from '@/test-utils/providers';
import { ConfirmProvider } from '@/shared/confirm/confirm-provider';
import { DocumentsPage } from './documents-page';

// Mock i18n（支持 t(key, defaultValue) 与 t(key, { defaultValue, ...vars }) 两种签名，含 {{var}} 插值）
vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => undefined },
  useTranslation: () => ({
    t: (key: string, options?: string | { defaultValue?: string } & Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'document.title': '文档管理',
        'document.description': '管理项目文档、API规范和技术指南',
        'common.delete': '删除',
        'common.cancel': '取消',
      };
      const vars = typeof options === 'object' && options ? options : null;
      let text = translations[key] ?? (typeof options === 'string' ? options : vars?.defaultValue ?? key);
      if (vars) {
        text = text.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(vars[name] ?? ''));
      }
      return text;
    },
    i18n: { language: 'zh-CN' },
  }),
}));

const { deleteMutate } = vi.hoisted(() => ({ deleteMutate: vi.fn() }));

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

// Mock document mutations（useDocumentDeleteFlow 内部经此模块调 useDeleteDocument）
vi.mock('../hooks/use-document-mutations', () => ({
  useDeleteDocument: () => ({ mutateAsync: deleteMutate, isPending: false }),
  useCreateDocument: () => ({ mutate: vi.fn() }),
  useUpdateDocument: () => ({ mutate: vi.fn() }),
}));

// Mock sync warnings
vi.mock('../hooks/use-sync-warnings', () => ({
  useSyncWarnings: () => ({ data: [] }),
  useClearSyncWarning: () => ({ mutate: vi.fn() }),
}));

function renderPage() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ConfirmProvider>
          <DocumentsPage />
        </ConfirmProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function openCardMenu(title: string) {
  const card = screen.getByText(title).closest('[data-ai-component]');
  expect(card).toBeTruthy();
  const menuButton = within(card as HTMLElement).getByRole('button', { name: '更多操作' });
  await userEvent.click(menuButton);
}

describe('DocumentsPage', () => {
  it('renders document list and actions', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: '文档管理' })).toBeTruthy();
    expect(screen.getByText('Architecture Overview')).toBeTruthy();
    expect(screen.getByText('UI Unification V1')).toBeTruthy();
    expect(screen.getByText('Figma Rollout Checklist')).toBeTruthy();
  });

  it('card view: delete opens confirm dialog and calls mutation on confirm', async () => {
    deleteMutate.mockClear().mockResolvedValue({ success: true });
    renderPage();

    await openCardMenu('Architecture Overview');

    const deleteButton = document.querySelector(
      '[data-ai-component="document.document-list.card.1.delete"]',
    ) as HTMLButtonElement | null;
    expect(deleteButton).toBeTruthy();
    await userEvent.click(deleteButton!);

    // 确认弹窗出现，文案含文档标题与不可撤销提示
    expect(
      await screen.findByText('确定要删除文档「Architecture Overview」吗？此操作不可撤销。'),
    ).toBeTruthy();

    // 取消不触发删除
    await userEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(deleteMutate).not.toHaveBeenCalled();

    // 再次确认 → 调用删除
    await openCardMenu('Architecture Overview');
    await userEvent.click(
      document.querySelector('[data-ai-component="document.document-list.card.1.delete"]')!,
    );
    await userEvent.click(await screen.findByRole('button', { name: '删除' }));
    expect(deleteMutate).toHaveBeenCalledTimes(1);
    expect(deleteMutate).toHaveBeenCalledWith('1');
  });

  it('list view: delete opens confirm dialog and calls mutation on confirm', async () => {
    deleteMutate.mockClear().mockResolvedValue({ success: true });
    renderPage();

    // 切到列表视图
    await userEvent.click(await screen.findByRole('button', { name: '列表' }));

    const row = screen.getByText('UI Unification V1').closest('[data-ai-component]');
    expect(row).toBeTruthy();
    await userEvent.click(
      within(row as HTMLElement).getByRole('button', { name: '更多操作' }),
    );

    const deleteButton = document.querySelector(
      '[data-ai-component="document.document-list.list-item.2.delete"]',
    ) as HTMLButtonElement | null;
    expect(deleteButton).toBeTruthy();
    await userEvent.click(deleteButton!);

    expect(
      await screen.findByText('确定要删除文档「UI Unification V1」吗？此操作不可撤销。'),
    ).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '删除' }));
    expect(deleteMutate).toHaveBeenCalledWith('2');
  });
});
