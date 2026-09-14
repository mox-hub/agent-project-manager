import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RequirementIntakePage } from './requirement-intake-page';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

vi.mock('@/components/ui/page-shell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const openCreateDialog = vi.fn();
vi.mock('@/infrastructure/store/app-store', () => ({
  useAppStore: (selector: (s: { openCreateDialog: unknown }) => unknown) =>
    selector({ openCreateDialog }),
}));

const documentQuerySpy = vi.fn();
vi.mock('@/modules/document/hooks/use-documents', () => ({
  useDocuments: (query?: Record<string, unknown>) => {
    documentQuerySpy(query);
    return { data: [], isLoading: false };
  },
}));

function renderPage() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <RequirementIntakePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('需求承接页（CAP-A-15 / GAP-T-24）', () => {
  beforeEach(() => {
    openCreateDialog.mockClear();
    documentQuerySpy.mockClear();
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

  it('承接管道四步说明渲染', () => {
    renderPage();
    for (const step of ['需求澄清', '访谈补全', '生成与确认', '审计把关']) {
      expect(screen.getByText(step)).toBeInTheDocument();
    }
  });
});
