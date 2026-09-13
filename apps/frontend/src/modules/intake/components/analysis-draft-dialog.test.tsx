import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AnalysisDraftDialog } from './analysis-draft-dialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
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

// base-ui Select 在 jsdom 交互成本高：mock 为受控原生 select（value/onChange 契约一致）
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      data-testid="source-select"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
}));

const silentSpy = vi.fn();
vi.mock('@/modules/assistant/api/assistant-api', () => ({
  assistantApi: {
    silent: (...args: unknown[]) => silentSpy(...args),
  },
}));

const createDocSpy = vi.fn();
vi.mock('@/modules/document/api/document-api', () => ({
  documentApi: {
    create: (...args: unknown[]) => createDocSpy(...args),
  },
}));

const PAYLOAD = {
  feasibility: { verdict: 'conditional', rationale: '推送依赖 IT', conditions: ['开通网关'] },
  impact: { summary: '新增模块', affectedAreas: ['消息推送'] },
  dependencies: [{ item: '推送网关', note: '权限' }],
  risks: [{ risk: '到达率', severity: 'high', mitigation: '验证任务' }],
  acceptancePreview: [{ content: '会后 10 分钟可查', criteriaType: 'functional' }],
};

const DOCS = [
  { id: 'r1', title: '需求调研纪要 · P', projectName: 'P' },
  { id: 'c1', title: '需求澄清纪要 · P', projectName: 'P' },
];

function renderDialog(props: Partial<Parameters<typeof AnalysisDraftDialog>[0]> = {}) {
  const qc = new QueryClient();
  qc.setDefaultOptions({ mutations: { retry: false } });
  return render(
    <QueryClientProvider client={qc}>
      <AnalysisDraftDialog
        open
        onOpenChange={vi.fn()}
        projectId="p1"
        docs={DOCS}
        defaultResearchId="r1"
        {...props}
      />
    </QueryClientProvider>,
  );
}

describe('需求分析代写对话框（CAP-P-01 四期 / GAP-T-29）', () => {
  beforeEach(() => {
    silentSpy.mockReset().mockResolvedValue({ scenario: 'analysis-draft', data: PAYLOAD });
    createDocSpy.mockReset().mockResolvedValue({ id: 'd9' });
  });

  it('预置来源后生成：调 analysis-draft 场景携带 researchDocumentId，预览渲染 verdict 与验收预清单', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /生成分析报告/ }));
    await waitFor(() => expect(silentSpy).toHaveBeenCalledTimes(1));
    expect(silentSpy).toHaveBeenCalledWith('analysis-draft', {
      projectId: 'p1',
      context: { researchDocumentId: 'r1', clarifyDocumentId: undefined },
    });
    expect(await screen.findByText('有条件可行')).toBeInTheDocument();
    expect(screen.getByText('会后 10 分钟可查')).toBeInTheDocument();
  });

  it('确认归档：以 category=analysis 落文档并携带 markdown 正文', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /生成分析报告/ }));
    await screen.findByText('有条件可行');
    fireEvent.click(screen.getByRole('button', { name: /确认归档/ }));
    await waitFor(() => expect(createDocSpy).toHaveBeenCalledTimes(1));
    expect(createDocSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '需求分析报告 · P',
        category: 'analysis',
        projectId: 'p1',
      }),
    );
    const content = createDocSpy.mock.calls[0][0].content as string;
    expect(content).toContain('有条件可行');
    expect(content).toContain('- [ ] 会后 10 分钟可查');
  });

  it('无来源时生成按钮禁用（缺输入 400 前置防御）', () => {
    renderDialog({ defaultResearchId: undefined });
    expect(
      screen.getByRole('button', { name: /生成分析报告/ }),
    ).toBeDisabled();
  });

  it('AI 返回不可解析内容时可读报错不落库', async () => {
    silentSpy.mockResolvedValue({ scenario: 'analysis-draft', data: {} });
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /生成分析报告/ }));
    await waitFor(() =>
      expect(screen.getByText(/没有给出可用的分析内容/)).toBeInTheDocument(),
    );
    expect(createDocSpy).not.toHaveBeenCalled();
  });
});
