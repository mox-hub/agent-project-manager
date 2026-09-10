/**
 * Workflow 页面测试（GAP-T-13）——列表渲染/触发对话框/详情页 run 确认交互。
 * hooks 层整体 mock（api 经由 hooks 消费），i18n 走键名直读。
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkflowListPage } from './workflow-list-page';
import { WorkflowDetailPage } from './workflow-detail-page';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      const translations: Record<string, string> = {
        'workflow.title': 'Workflows',
        'workflow.run': 'Run',
        'workflow.runs': 'Run history',
        'workflow.status.suspended': 'Waiting for approval',
        'workflow.waitingApproval': 'Waiting for your approval',
        'workflow.approve': 'Approve & continue',
        'workflow.reject': 'Reject',
        'workflow.triggered': 'Run triggered',
      };
      const base = translations[key] ?? key;
      return opts?.name ? base.replace('{{name}}', opts.name) : base;
    },
  }),
}));

vi.mock('@/infrastructure/event-client', () => ({
  eventClient: { on: vi.fn(), off: vi.fn() },
}));

const hooksState: {
  workflows?: Array<Record<string, unknown>>;
  runs?: Array<Record<string, unknown>>;
  runDetail?: Record<string, unknown>;
} = {};

vi.mock('../hooks/use-workflows', () => ({
  useWorkflowEvents: vi.fn(),
  useWorkflows: () => ({ data: hooksState.workflows, isLoading: false }),
  useWorkflow: () => ({
    data: {
      id: 'wf-1',
      key: 'project-brief-demo',
      name: '项目简介三步流',
      version: 1,
      description: 'demo',
      createdAt: '',
      updatedAt: '',
      definition: {},
      stepsSummary: [
        { id: 'draft', type: 'llm', title: '起草' },
        { id: 'review', type: 'human-confirm', title: '人工确认' },
      ],
    },
    isLoading: false,
  }),
  useWorkflowRuns: () => ({ data: { data: hooksState.runs ?? [], meta: {} }, isLoading: false }),
  useWorkflowRun: () => ({ data: hooksState.runDetail, isLoading: false }),
  useTriggerWorkflow: () => {
    const mutate = vi.fn((input: Record<string, unknown>) => {
      resumeLog.lastTrigger = input;
    });
    return { mutate, isPending: false };
  },
  useResumeWorkflow: () => ({
    mutate: vi.fn((input: { data: { resumeData: Record<string, unknown> } }) => {
      resumeLog.lastResume = input.data.resumeData;
    }),
    isPending: false,
  }),
}));

// hooksState 扩展槽：记录最近一次 resume / trigger 负载
const resumeLog = hooksState as { lastResume?: unknown; lastTrigger?: unknown };

function renderWithProviders(ui: React.ReactElement, initialEntries?: string[]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries ?? ['/']}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('WorkflowListPage', () => {
  it('渲染定义卡片并展示版本号', () => {
    hooksState.workflows = [
      { id: 'wf-1', key: 'project-brief-demo', name: '项目简介三步流', version: 1 },
    ];
    renderWithProviders(<WorkflowListPage />);
    expect(screen.getByText('项目简介三步流')).toBeTruthy();
    expect(screen.getByText('v1')).toBeTruthy();
  });

  it('空定义时显示空态', () => {
    hooksState.workflows = [];
    renderWithProviders(<WorkflowListPage />);
    expect(screen.getByText('workflow.empty')).toBeTruthy();
  });

  it('运行对话框：提交后按入参触发并跳转', async () => {
    hooksState.workflows = [
      { id: 'wf-1', key: 'project-brief-demo', name: '项目简介三步流', version: 1 },
    ];
    renderWithProviders(<WorkflowListPage />);

    fireEvent.click(screen.getByRole('button', { name: /Run/ }));
    const textarea = (await waitFor(() =>
      screen.getByRole('textbox'),
    )) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '{"topic":"看板"}' } });

    // 提交（对话框 Footer 的 Run 按钮）
    const buttons = screen.getAllByRole('button', { name: /Run/ });
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => {
      expect(resumeLog.lastTrigger).toEqual({ parameters: { topic: '看板' } });
    });
  });
});

describe('WorkflowDetailPage', () => {
  it('suspended run 展示人工确认卡，批准携带 resumeData', async () => {
    hooksState.runs = [
      {
        id: 'run-1',
        workflowId: 'wf-1',
        status: 'suspended',
        triggerType: 'manual',
        createdAt: new Date().toISOString(),
        stepsState: {},
      },
    ];
    // RunDetailPanel 拉取 run 详情
    hooksState.runDetail = {
      id: 'run-1',
      workflowId: 'wf-1',
      status: 'suspended',
      triggerType: 'manual',
      createdAt: new Date().toISOString(),
      stepsState: {},
      waitingApproval: { stepId: 'review', title: '人工确认', message: '请审核：草稿内容' },
    };

    renderWithProviders(<WorkflowDetailPage />, ['/app/workflows/wf-1?runId=run-1']);

    await waitFor(() => {
      expect(screen.getByText(/请审核：草稿内容/)).toBeTruthy();
    });

    const approve = screen.getByRole('button', { name: /Approve & continue/ });
    fireEvent.click(approve);
    await waitFor(() => {
      expect(resumeLog.lastResume).toEqual({ approved: true, note: '' });
    });
  });
});
