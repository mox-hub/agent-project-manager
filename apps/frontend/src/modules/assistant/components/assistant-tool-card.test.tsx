import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { AssistantToolCard, type AssistantToolPart } from './assistant-tool-card';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && 'count' in opts ? `${key}:${opts.count}` : key,
  }),
}));

vi.mock('@/modules/decision/hooks/use-decision-actions', () => ({
  useDecisionActions: () => ({ handleAction: vi.fn(), busyId: null }),
}));

function renderCard(part: Partial<AssistantToolPart>) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <AssistantToolCard part={{ type: 'tool-x', ...part } as AssistantToolPart} />
    </QueryClientProvider>,
  );
}

describe('AssistantToolCard', () => {
  it('调用中渲染 spinner 态折叠卡（动词×实体组合标签 + 输入摘要）', () => {
    renderCard({
      type: 'tool-create_task',
      toolName: 'create_task',
      state: 'input-available',
      input: { title: '登录页改版', projectId: 'p1' },
    });

    expect(screen.getByText(/verb\.create/)).toBeTruthy();
    expect(screen.getByText('登录页改版')).toBeTruthy();
    expect(
      document.querySelector('[data-tool-state="input-available"]'),
    ).toBeTruthy();
  });

  it('实体输出渲染标题/状态/详情跳转（bug 走 bugs 路由）', () => {
    renderCard({
      type: 'tool-create_task',
      toolName: 'create_task',
      state: 'output-available',
      input: { title: '登录页改版' },
      output: { issueId: 't1', shortId: 'AB12', title: '登录页改版', status: 'todo', type: 'bug' },
    });

    expect(screen.getAllByText('登录页改版').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('todo')).toBeTruthy();
    const link = screen.getByText('assistant.tool.view');
    expect((link as HTMLAnchorElement).getAttribute('href')).toBe('/app/bugs/t1');
    expect(
      document.querySelector('[data-tool-state="output-available"]'),
    ).toBeTruthy();
  });

  it('错误输出渲染可读错误（工具返回 error 字段）', () => {
    renderCard({
      type: 'tool-create_task',
      toolName: 'create_task',
      state: 'output-available',
      input: { title: 'x' },
      output: { error: 'Invalid status: xx' },
    });

    expect(screen.getByText('Invalid status: xx')).toBeTruthy();
    expect(document.querySelector('[data-tool-state="output-available"] svg.text-accent-red')).toBeTruthy();
  });

  it('列表输出渲染结果数与前 3 条样例', () => {
    renderCard({
      type: 'tool-list_project_tasks',
      toolName: 'list_project_tasks',
      state: 'output-available',
      input: {},
      output: {
        tasks: [
          { id: '1', title: '任务一' },
          { id: '2', title: '任务二' },
          { id: '3', title: '任务三' },
          { id: '4', title: '任务四' },
        ],
      },
    });

    expect(screen.getAllByText('assistant.tool.resultCount:4').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/任务一/)).toBeTruthy();
    expect(screen.getByText(/任务三/)).toBeTruthy();
    expect(screen.queryByText(/任务四/)).toBeNull();
  });

  it('propose_decision 完整输出内联决策卡；残缺输出回退普通工具卡', () => {
    const { unmount } = renderCard({
      type: 'tool-propose_decision',
      toolName: 'propose_decision',
      state: 'output-available',
      input: {},
      output: {
        proposalId: 'dp-1',
        status: 'pending',
        kind: 'plan',
        title: '重构登录模块',
        payload: { added: [{ title: '拆步骤' }] },
        createdAt: '2026-09-04T08:00:00Z',
      },
    });

    expect(
      document.querySelector('[data-ai-component="assistant.tool-decision"]'),
    ).toBeTruthy();
    expect(screen.getByText('重构登录模块')).toBeTruthy();
    unmount();

    renderCard({
      type: 'tool-propose_decision',
      toolName: 'propose_decision',
      state: 'output-available',
      input: {},
      output: { proposalId: 'p1' },
    });
    expect(
      document.querySelector('[data-ai-component="assistant.tool-card"]'),
    ).toBeTruthy();
  });
});
