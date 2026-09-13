/**
 * Workflow 详情页「编辑回写」测试（GAP-T-14 清偿）——
 * saveEditing 的 definition 组装契约：保留原 definition 其余字段（inputHint）、
 * 强制 version:1、steps 顺序与字段原样回写；节点库插入 → 保存载荷携带新节点；
 * 保存成功退出编辑 / 取消不触发 mutate / 空步骤与保存中按钮禁用。
 * 手法对齐 workflow-pages.test.tsx：hooks 层整体 mock，i18n 走键名直读。
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkflowDetailPage } from './workflow-detail-page';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/infrastructure/event-client', () => ({
  eventClient: { on: vi.fn(), off: vi.fn() },
}));

// ── 可控 fixtures ──
// definition.version 故意给 3：saveEditing 必须强制覆写为 1（文法 v2 契约）
const DEFINITION = {
  version: 3,
  inputHint: { topic: '项目主题（一句话）' },
  steps: [
    { id: 'draft', type: 'llm', title: '起草', prompt: '为 {input.topic} 起草' },
    { id: 'review', type: 'human-confirm', title: '人工确认', message: '请审核：{steps.draft.value}' },
  ],
};

const WORKFLOW = {
  id: 'wf-1',
  key: 'project-brief-demo',
  name: '项目简介三步流',
  version: 3,
  description: 'demo',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  definition: DEFINITION,
  stepsSummary: [],
};

const ACTIONS = [
  {
    id: 'issue.create',
    title: '创建工单',
    description: '在指定项目下创建一条任务',
    requiredParams: ['projectId', 'title'],
    inputHint: { projectId: '项目 ID', title: '标题' },
  },
];

const hooksState: {
  workflow?: Record<string, unknown> | null;
  updating?: boolean;
} = {};

// updateLog 记录最近一次 useUpdateWorkflow.mutate 的载荷（mock 工厂闭包直写）
const updateLog: { payloads: Array<Record<string, unknown>> } = { payloads: [] };

vi.mock('../hooks/use-workflows', () => ({
  useWorkflowEvents: vi.fn(),
  useWorkflow: () => ({ data: hooksState.workflow, isLoading: false }),
  useWorkflowRuns: () => ({ data: { data: [], meta: {} }, isLoading: false }),
  useWorkflowRun: () => ({ data: undefined, isLoading: false }),
  useResumeWorkflow: () => ({ mutate: vi.fn(), isPending: false }),
  useWorkflowActions: () => ({ data: ACTIONS, isLoading: false }),
  useUpdateWorkflow: () => ({
    // 同步记录载荷并回调 onSuccess（模拟保存成功路径）
    mutate: (
      input: Record<string, unknown>,
      opts?: { onSuccess?: () => void },
    ) => {
      updateLog.payloads.push(input);
      opts?.onSuccess?.();
    },
    isPending: hooksState.updating ?? false,
  }),
}));

function renderDetailPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/workflows/wf-1']}>
        <WorkflowDetailPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function enterEditing() {
  fireEvent.click(screen.getByRole('button', { name: 'workflow.editor.edit' }));
}

beforeEach(() => {
  hooksState.workflow = WORKFLOW;
  hooksState.updating = false;
  updateLog.payloads = [];
});

describe('WorkflowDetailPage 编辑回写（saveEditing → PATCH /workflows/:id）', () => {
  it('进入编辑模式：出现保存/取消按钮与节点库，原按钮退场', () => {
    const { container } = renderDetailPage();
    enterEditing();

    expect(screen.getByRole('button', { name: 'workflow.editor.save' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'workflow.editor.cancel' })).toBeTruthy();
    expect(container.querySelector('[data-ai="workflow.palette"]')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'workflow.editor.edit' })).toBeNull();
  });

  it('原样保存：definition 组装保留 inputHint、version 强制覆写为 1、steps 顺序与字段原样', () => {
    renderDetailPage();
    enterEditing();
    fireEvent.click(screen.getByRole('button', { name: 'workflow.editor.save' }));

    expect(updateLog.payloads).toEqual([
      {
        definition: {
          ...DEFINITION,
          version: 1,
          steps: [
            { id: 'draft', type: 'llm', title: '起草', prompt: '为 {input.topic} 起草' },
            {
              id: 'review',
              type: 'human-confirm',
              title: '人工确认',
              message: '请审核：{steps.draft.value}',
            },
          ],
        },
      },
    ]);
  });

  it('节点库插入 llm 节点后保存：steps 携带新节点（末尾追加、id 自动避让）', () => {
    const { container } = renderDetailPage();
    enterEditing();

    const llmItem = container.querySelector('[data-ai="workflow.palette.llm"]');
    expect(llmItem).toBeTruthy();
    fireEvent.click(llmItem as Element);
    fireEvent.click(screen.getByRole('button', { name: 'workflow.editor.save' }));

    const payload = updateLog.payloads[0] as {
      definition: { version: number; steps: Array<Record<string, unknown>> };
    };
    expect(payload.definition.version).toBe(1);
    expect(payload.definition.steps).toHaveLength(3);
    // 已有 draft/review → 新节点 id 从 step-3 起避让，追加在链尾
    expect(payload.definition.steps[2]).toEqual({ id: 'step-3', type: 'llm' });
    expect(payload.definition.steps.slice(0, 2)).toEqual(DEFINITION.steps);
  });

  it('保存成功回调退出编辑模式（回到只读态）', async () => {
    renderDetailPage();
    enterEditing();
    fireEvent.click(screen.getByRole('button', { name: 'workflow.editor.save' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'workflow.editor.save' })).toBeNull();
    });
    expect(screen.getByRole('button', { name: 'workflow.editor.edit' })).toBeTruthy();
    // 退出编辑不产生第二次 mutate
    expect(updateLog.payloads).toHaveLength(1);
  });

  it('取消退出编辑：不触发 mutate', () => {
    renderDetailPage();
    enterEditing();
    fireEvent.click(screen.getByRole('button', { name: 'workflow.editor.cancel' }));

    expect(screen.getByRole('button', { name: 'workflow.editor.edit' })).toBeTruthy();
    expect(updateLog.payloads).toHaveLength(0);
  });

  it('步骤清空（definition.steps 为空）时保存按钮禁用', () => {
    hooksState.workflow = { ...WORKFLOW, definition: { ...DEFINITION, steps: [] } };
    renderDetailPage();
    enterEditing();

    const save = screen.getByRole('button', {
      name: 'workflow.editor.save',
    }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it('保存进行中（isPending）时保存按钮禁用', () => {
    hooksState.updating = true;
    renderDetailPage();
    enterEditing();

    const save = screen.getByRole('button', {
      name: 'workflow.editor.save',
    }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });
});
