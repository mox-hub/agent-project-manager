import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RequirementIntakePage } from './requirement-intake-page';
import { usePipelineFocusStore } from '@/shared/layout/pipeline-focus';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

vi.mock('@/components/ui/page-shell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const openCreateDialog = vi.fn();
vi.mock('@/infrastructure/store/app-store', () => ({
  useAppStore: (selector: (s: { openCreateDialog: unknown }) => unknown) =>
    selector({ openCreateDialog }),
}));

const documentQuerySpy = vi.fn(
  (query?: Record<string, unknown>): {
    data: Array<Record<string, unknown>>;
    isLoading: boolean;
  } => {
    void query;
    return { data: [], isLoading: false };
  },
);
vi.mock('@/modules/document/hooks/use-documents', () => ({
  useDocuments: (query?: Record<string, unknown>) => documentQuerySpy(query),
}));

function renderPage(route = '/') {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <RequirementIntakePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('需求承接页（CAP-A-15 / GAP-T-24）', () => {
  beforeEach(() => {
    openCreateDialog.mockClear();
    documentQuerySpy.mockClear();
    // 管道项目聚焦 store 为模块级单例：逐用例重置，避免 URL 覆盖写回互相污染
    usePipelineFocusStore.setState({ focusProjectId: null });
  });

  it('CTA 唤起统一创建面板并预置 project 类型（grill 入口）', () => {
    renderPage();
    const buttons = screen.getAllByRole('button', { name: /提出需求/ });
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(openCreateDialog).toHaveBeenCalledWith({ type: 'project' });
  });

  it('文档列表按 category=requirement 查询且空态可渲染', () => {
    renderPage();
    expect(documentQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'requirement' }),
    );
    expect(screen.getByText('尚无需求纪要')).toBeInTheDocument();
  });

  it('管道聚焦项目时（?project=p1）查询携带 projectId（CAP-A-15）', () => {
    renderPage('/app/intake?project=p1');
    expect(documentQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'requirement', projectId: 'p1' }),
    );
  });

  it('无聚焦时不携带 projectId 参数键', () => {
    renderPage('/app/intake');
    const query = documentQuerySpy.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(query.projectId).toBeUndefined();
  });

  it('承接管道五步说明渲染（含 CAP-P-01 四期分析评估）', () => {
    renderPage();
    for (const step of ['需求澄清', '访谈补全', '分析评估', '生成与确认', '审计把关']) {
      expect(screen.getByText(step)).toBeInTheDocument();
    }
  });

  it('分析报告区独立查询 category=analysis，空态可渲染（CAP-P-01 四期）', () => {
    renderPage();
    expect(documentQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'analysis' }),
    );
    expect(screen.getByText('尚无分析报告')).toBeInTheDocument();
  });

  it('无需求纪要时「AI 生成分析报告」入口禁用，有纪要时可点击打开对话框', () => {
    const { unmount } = renderPage();
    expect(screen.getByRole('button', { name: /AI 生成分析报告/ })).toBeDisabled();
    unmount();

    // 有纪要：mock 返回一条 requirement 文档，入口可点且对话框打开
    documentQuerySpy.mockImplementation((query?: Record<string, unknown>) => {
      if (query?.category === 'requirement') {
        return {
          data: [
            {
              id: 'r1',
              title: '需求调研纪要 · P',
              project: { name: 'P' },
              updatedAt: '2026-09-13T00:00:00Z',
              status: 'draft',
            },
          ],
          isLoading: false,
        };
      }
      return { data: [], isLoading: false };
    });
    renderPage();
    const cta = screen.getByRole('button', { name: /AI 生成分析报告/ });
    expect(cta).toBeEnabled();
    fireEvent.click(cta);
    expect(screen.getByText('AI 生成需求分析报告')).toBeInTheDocument();
  });
});
