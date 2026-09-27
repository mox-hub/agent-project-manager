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
    t: (key: string, opts?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'workflow.title': 'Workflows',
        'workflow.run': 'Run',
        'workflow.runs': 'Run history',
        'workflow.status.suspended': 'Waiting for approval',
        'workflow.waitingApproval': 'Waiting for your approval',
        'workflow.approve': 'Approve & continue',
        'workflow.reject': 'Reject',
        'workflow.triggered': 'Run triggered',
        'workflow.runPanel.stats.duration': '{{m}} 分 {{s}} 秒',
      };
      const base = translations[key] ?? key;
      return opts
        ? base.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(opts[k] ?? ''))
        : base;
    },
  }),
}));

vi.mock('@/infrastructure/event-client', () => ({
  eventClient: { on: vi.fn(), off: vi.fn() },
}));

const hooksState: {
  workflow?: Record<string, unknown>;
  workflows?: Array<Record<string, unknown>>;
  runs?: Array<Record<string, unknown>>;
  runDetail?: Record<string, unknown>;
} = {};

vi.mock('../hooks/use-workflows', () => ({
  useWorkflowEvents: vi.fn(),
  useWorkflows: () => ({ data: hooksState.workflows, isLoading: false }),
  useWorkflow: () => ({
    data: hooksState.workflow ?? {
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
    mutate: vi.fn((input: { data: Record<string, unknown> }) => {
      resumeLog.lastResume = input.data;
    }),
    isPending: false,
  }),
  useCancelWorkflow: () => ({ mutate: vi.fn(), isPending: false }),
  useWorkflowActions: () => ({ data: [], isLoading: false }),
  useCreateWorkflow: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateWorkflow: () => ({
    mutate: vi.fn((input: { definition?: Record<string, unknown> }) => {
      resumeLog.lastUpdate = input;
    }),
    isPending: false,
  }),
}));

// hooksState 扩展槽：记录最近一次 resume / trigger 负载
const resumeLog = hooksState as { lastResume?: unknown; lastTrigger?: unknown; lastUpdate?: unknown };

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
      {
        id: 'wf-1',
        key: 'project-brief-demo',
        name: '项目简介三步流',
        version: 1,
        grammarVersion: 2,
      },
    ];
    renderWithProviders(<WorkflowListPage />);
    expect(screen.getByText('项目简介三步流')).toBeTruthy();
    // 徽标显示文法版本（CAP-S-03 V1→V2 替换后口径）
    expect(screen.getByText('v2')).toBeTruthy();
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
    // RunPanel（主区）拉取 run 详情
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
      expect(resumeLog.lastResume).toEqual({ resumeData: { approved: true, note: '' } });
    });
  });

  it('v2 run 渲染阶段时间线：站名/药丸/计数/产物/统计（ZCode 卡形态复刻）', async () => {
    hooksState.runs = [
      {
        id: 'run-v2',
        workflowId: 'wf-1',
        status: 'succeeded',
        triggerType: 'manual',
        createdAt: new Date().toISOString(),
      },
    ];
    hooksState.runDetail = {
      id: 'run-v2',
      workflowId: 'wf-1',
      status: 'succeeded',
      triggerType: 'manual',
      engineVersion: 2,
      startedAt: '2026-09-26T00:00:00.000Z',
      finishedAt: '2026-09-26T00:04:45.000Z',
      createdAt: new Date().toISOString(),
      graphSummary: [
        { id: 'prep', type: 'llm', title: '准备演示代码' },
        {
          id: 'review',
          type: 'fan-out',
          title: '逐个文件评审',
          children: [
            { id: 'rv-a', type: 'llm', title: '评审员 A' },
            { id: 'rv-b', type: 'llm', title: '评审员 B' },
          ],
        },
        { id: 'report', type: 'agent', title: '汇总报告' },
      ],
      nodeRuns: [
        {
          id: 'nr-1', runId: 'run-v2', nodeId: 'prep', nodeType: 'llm', attempt: 1,
          status: 'succeeded', createdAt: '2026-09-26T00:00:00.000Z',
        },
        {
          id: 'nr-2', runId: 'run-v2', nodeId: 'rv-a@i0', nodeType: 'llm', attempt: 1,
          status: 'succeeded', createdAt: '2026-09-26T00:01:00.000Z',
        },
        {
          id: 'nr-3', runId: 'run-v2', nodeId: 'rv-b@i1', nodeType: 'llm', attempt: 1,
          status: 'succeeded', createdAt: '2026-09-26T00:01:00.000Z',
        },
        {
          id: 'nr-4', runId: 'run-v2', nodeId: 'report', nodeType: 'agent', attempt: 1,
          status: 'running', createdAt: '2026-09-26T00:02:00.000Z',
        },
      ],
      output: { steps: { report: { documentId: 'doc-1', title: '演示报告' } } },
    };

    renderWithProviders(<WorkflowDetailPage />, ['/app/workflows/wf-1?runId=run-v2']);

    // 种类词表头（v2 succeeded）
    await waitFor(() => {
      expect(screen.getByText('workflow.runPanel.kindSucceeded')).toBeTruthy();
    });
    // 站名与药丸（叶子站站头与药丸同名，用 getAllByText）
    expect(screen.getAllByText('准备演示代码').length).toBeGreaterThan(0);
    expect(screen.getByText('逐个文件评审')).toBeTruthy();
    expect(screen.getByText('评审员 A')).toBeTruthy();
    // fan-out 站计数徽标 2/2
    expect(screen.getByText('2/2')).toBeTruthy();
    // 文档回流产物行
    expect(screen.getByText('演示报告')).toBeTruthy();
    // 四格统计：时间 4 分 45 秒
    expect(screen.getByText('4 分 45 秒')).toBeTruthy();
  });

  it('v2 定义默认态渲染静态阶段预览与运行入口（替代空画布）', async () => {
    hooksState.runs = [];
    hooksState.workflow = {
      id: 'wf-v2',
      key: 'v2-flow',
      name: 'v2 自定义流',
      version: 1,
      grammarVersion: 2,
      description: '',
      createdAt: '',
      updatedAt: '',
      definition: { version: 2, nodes: [] },
      stepsSummary: [
        { id: 'prep', type: 'llm', title: '准备演示代码' },
        { id: 'review', type: 'human', title: '人工确认' },
      ],
    };

    renderWithProviders(<WorkflowDetailPage />, ['/app/workflows/wf-v2']);

    // 预览卡：静态站列 + 未执行模板药丸（站头与药丸同名双渲染）
    await waitFor(() => {
      expect(screen.getByText('workflow.runPanel.previewTitle')).toBeTruthy();
      expect(screen.getAllByText('准备演示代码').length).toBeGreaterThan(0);
      expect(screen.getAllByText('人工确认').length).toBeGreaterThan(0);
    });
    // 触发入口（HeaderActionButton aria-label，i18n 表译为 Run）
    expect(screen.getByRole('button', { name: /^Run$/ })).toBeTruthy();
  });
});

describe('WorkflowDetailPage v2（CAP-S-03）', () => {
  it('v2 运行面板渲染阶段药丸与取消按钮，恢复携带 nodeId', async () => {
    hooksState.runs = [
      {
        id: 'run-2',
        workflowId: 'wf-1',
        status: 'suspended',
        triggerType: 'manual',
        engineVersion: 2,
        createdAt: new Date().toISOString(),
      },
    ];
    hooksState.runDetail = {
      id: 'run-2',
      workflowId: 'wf-1',
      status: 'suspended',
      engineVersion: 2,
      triggerType: 'manual',
      createdAt: new Date().toISOString(),
      waitingApproval: {
        stepId: 'review',
        nodeId: 'review',
        mode: 'inline',
        message: '请确认 {input.docTitle}',
      },
      graphSummary: [
        { id: 'make-doc', type: 'action', title: '生成文档' },
        { id: 'dispatch-impl', type: 'agent', title: '派发实现' },
        { id: 'review', type: 'human', title: '人工确认' },
      ],
      nodeRuns: [
        { id: 'n1', runId: 'run-2', nodeId: 'make-doc', nodeType: 'action', attempt: 1, status: 'succeeded' },
        {
          id: 'n2',
          runId: 'run-2',
          nodeId: 'dispatch-impl',
          nodeType: 'agent',
          attempt: 1,
          status: 'failed',
          executionRunId: 'exec-abc',
          error: { code: 'agent_execution_failed', message: '执行项 failed', classification: 'agent_dispatch' },
        },
      ],
      events: [
        { id: 'e1', runId: 'run-2', seq: 1, type: 'run.started', createdAt: '' },
      ],
    };

    renderWithProviders(<WorkflowDetailPage />, ['/app/workflows/wf-1?runId=run-2']);

    // 阶段药丸（graphSummary 静态 title；站头与药丸同名双渲染）
    await waitFor(() => {
      expect(screen.getAllByText('生成文档').length).toBeGreaterThan(0);
      expect(screen.getAllByText('派发实现').length).toBeGreaterThan(0);
    });
    // v2 引擎徽标 + 取消按钮
    expect(screen.getByText('workflow.engineV2')).toBeTruthy();
    expect(screen.getByRole('button', { name: /workflow.cancelRun/ })).toBeTruthy();

    // 恢复携带 nodeId（v2 journal 精确到节点）
    fireEvent.click(screen.getByRole('button', { name: /Approve & continue/ }));
    await waitFor(() => {
      const data = resumeLog.lastResume as { nodeId?: string };
      expect(data.nodeId).toBe('review');
    });
  });

  it('v2 定义编辑走 JSON 源码模式，保存保留 version 2', async () => {
    hooksState.workflow = {
      id: 'wf-2',
      key: 'v2-custom-flow',
      name: 'v2 自定义流',
      version: 3,
      description: '',
      createdAt: '',
      updatedAt: '',
      definition: {
        version: 2,
        nodes: [{ id: 'make', type: 'action', action: 'document.create' }],
      },
    };
    renderWithProviders(<WorkflowDetailPage />, ['/app/workflows/wf-2']);

    // 进入编辑（画布不适用，出现 JSON 文本域）
    fireEvent.click(screen.getByRole('button', { name: /workflow.editor.edit/ }));
    const textarea = (await waitFor(() => screen.getByRole('textbox'))) as HTMLTextAreaElement;
    expect(JSON.parse(textarea.value)).toMatchObject({ version: 2 });

    // 非法 JSON 保存被拦截
    fireEvent.change(textarea, { target: { value: '{ not json' } });
    fireEvent.click(screen.getByRole('button', { name: /workflow.editor.save/ }));
    expect(screen.getByText('workflow.editor.jsonInvalid')).toBeTruthy();

    // 合法保存：version 2 原样保留（不得被降级覆写为 1）
    const next = { version: 2, nodes: [{ id: 'make', type: 'action', action: 'document.create' }] };
    fireEvent.change(textarea, { target: { value: JSON.stringify(next, null, 2) } });
    fireEvent.click(screen.getByRole('button', { name: /workflow.editor.save/ }));
    await waitFor(() => {
      const update = resumeLog.lastUpdate as { definition?: { version?: number } } | undefined;
      expect(update?.definition?.version).toBe(2);
    });
  });
});

