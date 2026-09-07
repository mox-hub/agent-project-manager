import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RunDetailsDialog } from './run-details-dialog';
import type { ExecutionRunDetail } from '../api/execution-api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) =>
      opts && typeof opts.count === 'number' ? `${key}:${opts.count}` : key,
  }),
}));

const mockState = vi.hoisted(() => ({
  detail: undefined as ExecutionRunDetail | undefined,
  isLoading: false,
  events: [] as unknown[],
}));

vi.mock('../api/execution-api', () => ({
  isTerminalRunStatus: (status?: string | null) =>
    !!status && ['completed', 'failed', 'blocked', 'superseded'].includes(status),
  useExecutionRunDetail: () => ({
    data: mockState.detail,
    isLoading: mockState.isLoading,
  }),
  useExecutionRunEvents: () => ({ data: mockState.events }),
  useExecutionRunLogs: () => ({ data: [] }),
}));

function renderDialog() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RunDetailsDialog runId="run-1" open onOpenChange={() => {}} />
    </QueryClientProvider>,
  );
}

function makeDetail(overrides: Partial<ExecutionRunDetail> = {}): ExecutionRunDetail {
  return {
    id: 'run-1',
    projectId: 'p1',
    subjectType: 'platform_ai_member',
    subjectId: 'm1',
    subjectName: 'Mika',
    identitySource: 'cli',
    goal: '修复登录页',
    status: 'completed',
    createdAt: '2026-09-04T01:00:00Z',
    updatedAt: '2026-09-04T01:09:00Z',
    startedAt: '2026-09-04T01:00:00Z',
    completedAt: '2026-09-04T01:09:00Z',
    totalTokens: 17400,
    totalCost: 0.51,
    steps: [],
    artifacts: [],
    bindings: [],
    ...overrides,
  };
}

describe('RunDetailsDialog', () => {
  it('加载中渲染占位', () => {
    mockState.isLoading = true;
    mockState.detail = undefined;
    renderDialog();
    expect(screen.queryByRole('status')).toBeTruthy();
  });

  it('渲染头部：目标/状态/触发来源/tokens/费用与详情面板触发钮', () => {
    mockState.isLoading = false;
    mockState.detail = makeDetail();
    mockState.events = [];
    renderDialog();
    expect(screen.getByText('修复登录页')).toBeTruthy();
    expect(screen.getByText('runDetails.status.completed')).toBeTruthy();
    expect(screen.getByText('runDetails.trigger.cli')).toBeTruthy();
    expect(screen.getByText('17.4K')).toBeTruthy();
    expect(screen.getByText('$0.51')).toBeTruthy();
    expect(screen.getByTitle('runDetails.title')).toBeTruthy(); // ℹ 信息面板触发钮
  });

  it('steps 存在时渲染时间轴双行与事件条目', () => {
    mockState.isLoading = false;
    mockState.detail = makeDetail({
      steps: [
        {
          id: 's1',
          executionRunId: 'run-1',
          stepType: 'tool_call',
          sequence: 1,
          name: 'Bash',
          input: { command: 'ls -la' },
          status: 'completed',
          startedAt: '2026-09-04T01:00:10Z',
          completedAt: '2026-09-04T01:00:12Z',
          duration: 2000,
        },
      ],
    });
    renderDialog();
    expect(screen.getByText('runDetails.timeline.model')).toBeTruthy();
    expect(screen.getByText('runDetails.timeline.tools')).toBeTruthy();
    expect(screen.getByText('Bash')).toBeTruthy();
    expect(screen.getByText('+00:10')).toBeTruthy();
  });

  it('artifacts 聚合为产出 chips', () => {
    mockState.isLoading = false;
    mockState.detail = makeDetail({
      artifacts: [
        { artifactType: 'file_path' },
        { artifactType: 'file_path' },
        { artifactType: 'command_output' },
      ] as never[],
    });
    renderDialog();
    expect(screen.getByText('runDetails.outputsFiles:2')).toBeTruthy();
    expect(screen.getByText('runDetails.outputsCommands:1')).toBeTruthy();
  });
});
