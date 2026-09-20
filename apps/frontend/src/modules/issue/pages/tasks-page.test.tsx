import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TasksPage } from './tasks-page';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | { defaultValue?: string }) => {
      if (typeof defaultValue === 'string') return defaultValue;
      return defaultValue?.defaultValue ?? key;
    },
  }),
  // 导入链经 @/hooks/useTranslation → @/i18n 触达 i18n 初始化，需提供该导出（照抄 acceptance-list-page 模式）
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

// useAllTasks 委托到可控 mock：错误态/成功态/真空态场景分别注入（工厂内惰性读取，避免 TDZ）
const useAllTasksMock = vi.fn();
const refetchMock = vi.fn(async () => undefined);

vi.mock('../hooks/use-project-tasks', () => ({
  useAllTasks: (...args: unknown[]) => useAllTasksMock(...args),
  useDeleteTask: () => ({
    mutateAsync: vi.fn(async () => undefined),
  }),
  useUpdateTask: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(async () => undefined),
  }),
}));

vi.mock('../hooks/use-issue-types', () => ({
  useIssueTypes: () => ({ types: [], byId: new Map(), byKey: new Map() }),
  useIssueTypeOf: () => () => undefined,
}));

vi.mock('@/modules/project/hooks/use-project-list', () => ({
  useProjectList: () => ({ data: undefined }),
}));

vi.mock('@/shared/layout/pipeline-focus', () => ({
  usePipelineProjectFilter: () => ({ focusProjectId: undefined }),
}));

vi.mock('@/modules/execution/hooks/use-active-executions-map', () => ({
  useActiveExecutionsMap: () => ({
    getIssueExecution: () => null,
    totalActiveAiCount: 0,
  }),
}));

vi.mock('@/shared/confirm/use-confirm', () => ({
  useConfirm: () => async () => true,
}));

vi.mock('@/shared/context-menu/use-issue-row-menu', () => ({
  useIssueRowMenu: () => () => undefined,
}));

vi.mock('../components/ai-assign-dialog', () => ({
  AiAssignDialog: () => null,
}));

vi.mock('../components/task-simple-list', () => ({
  TaskSimpleList: () => <div data-testid="task-view-list" />,
}));

vi.mock('../components/task-table-view', () => ({
  TaskTableView: () => <div data-testid="task-view-table" />,
}));

vi.mock('../components/task-gantt', () => ({
  TaskGantt: () => <div data-testid="task-view-gantt" />,
}));

vi.mock('@/shared/components/board-view/board-view', () => ({
  BoardView: () => <div data-testid="task-view-board" />,
}));

vi.mock('@/shared/components/create-dialog', () => ({
  UnifiedCreateDialog: () => null,
}));

const taskItem = {
  id: 't1',
  title: 'Prepare release plan',
  status: 'todo',
  priority: 'medium',
  projectId: 'p1',
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

// 默认注入成功态（useQuery.data = TaskListResponse：{ data: Task[], meta }）
beforeEach(() => {
  useAllTasksMock.mockReset();
  useAllTasksMock.mockReturnValue({
    data: { data: [taskItem], meta: { page: 1, pageSize: 1000, total: 1, totalPages: 1 } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: refetchMock,
  });
});

const renderTasksPage = () =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/app/issues']}>
        <TasksPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('TasksPage', () => {
  it('renders success data with list view and without error state', async () => {
    renderTasksPage();

    expect(await screen.findByTestId('task-view-list')).toBeTruthy();
    expect(screen.queryByText('加载失败')).toBeNull();
    expect(screen.queryByText('暂无任务')).toBeNull();
  });

  it('renders error state with retry on query failure instead of the create-first empty state', async () => {
    refetchMock.mockClear();
    // 请求失败（isError + data 为 undefined → 派生 allTasks 为空数组）：
    // 不得误判为「暂无任务」真空态，必须渲染错误态 + 重试
    useAllTasksMock.mockReturnValue({
      data: undefined,
      meta: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Internal Server Error'),
      refetch: refetchMock,
    });

    renderTasksPage();

    expect(await screen.findByText('加载失败')).toBeTruthy();
    expect(screen.getByText('Internal Server Error')).toBeTruthy();
    expect(screen.queryByText('暂无任务')).toBeNull();
    expect(screen.queryByText('创建第一个任务，或从需求承接管道拆解生成')).toBeNull();
    expect(screen.queryByTestId('task-view-list')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the genuine empty state when the query succeeds with an empty list', async () => {
    // 成功 + 空数组 = 真空态：仍渲染「暂无任务」引导创建，而非错误态
    useAllTasksMock.mockReturnValue({
      data: { data: [], meta: { page: 1, pageSize: 1000, total: 0, totalPages: 0 } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchMock,
    });

    renderTasksPage();

    expect(await screen.findByText('暂无任务')).toBeTruthy();
    expect(screen.queryByText('加载失败')).toBeNull();
  });
});
