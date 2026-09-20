import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { IterationDetailDialog } from './iteration-detail-dialog';
import type { IterationRef } from '../api/issue-api';

// i18n mock（字典式，照抄 project-milestones-page 模式 + {{var}} 插值）
const translate = (
  key: string,
  opts?: Record<string, string | number>,
) => {
  const translations: Record<string, string> = {
    'project.milestonesPage.status.planned': '待启动',
    'project.milestonesPage.status.inProgress': '进行中',
    'project.milestonesPage.status.completed': '已完成',
    'project.milestonesPage.status.cancelled': '已取消',
    'project.milestonesPage.taskCount': '{{count}} 个任务',
    'project.milestonesPage.editIteration': '编辑迭代',
    'common.close': '关闭',
  };
  let base = translations[key] ?? key;
  if (opts) {
    for (const [k, v] of Object.entries(opts)) {
      base = base.replace(`{{${k}}}`, String(v));
    }
  }
  return base;
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: translate }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const useProjectTasksMock = vi.fn();
vi.mock('../hooks/use-project-tasks', () => ({
  useProjectTasks: (...args: unknown[]) => useProjectTasksMock(...args),
}));

const asApi = <T,>(value: object) => value as T;

const ITERATION = asApi<IterationRef>({
  id: 'it-1',
  projectId: 'proj-1',
  name: 'Sprint 1',
  status: 'planned', // 后端默认 planned；日期推导应显示「进行中」
  startDate: '2020-01-01',
  endDate: '2099-12-31',
  _count: { issues: 2 },
});

function renderDialog(ui: React.ReactElement) {
  return render(ui);
}

describe('IterationDetailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProjectTasksMock.mockReturnValue({
      data: {
        data: [
          asApi<object>({ id: 'i-1', title: '实现登录', status: 'done' }),
          asApi<object>({ id: 'i-2', title: '修复崩溃', status: 'in_progress' }),
        ],
      },
      isLoading: false,
    });
  });

  it('展示迭代名称、日期推导状态与工单列表', () => {
    renderDialog(
      <IterationDetailDialog
        open
        onOpenChange={vi.fn()}
        projectId="proj-1"
        iteration={ITERATION}
      />,
    );

    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    // 日期覆盖当前时间 → 推导为进行中（而非后端默认的 planned/待启动）
    expect(screen.getByText('进行中')).toBeInTheDocument();
    expect(screen.getByText('实现登录')).toBeInTheDocument();
    expect(screen.getByText('修复崩溃')).toBeInTheDocument();
  });

  it('按 iterationId 过滤查询工单（open 时才启用）', () => {
    renderDialog(
      <IterationDetailDialog
        open
        onOpenChange={vi.fn()}
        projectId="proj-1"
        iteration={ITERATION}
      />,
    );

    const [projectId, params, options] = useProjectTasksMock.mock.calls[0];
    expect(projectId).toBe('proj-1');
    expect(params).toMatchObject({ filters: { iterationId: ['it-1'] } });
    expect(options).toEqual({ enabled: true });
  });

  it('点击「编辑迭代」触发 onEdit 回调', () => {
    const onEdit = vi.fn();
    renderDialog(
      <IterationDetailDialog
        open
        onOpenChange={vi.fn()}
        projectId="proj-1"
        iteration={ITERATION}
        onEdit={onEdit}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /编辑迭代/ }));
    expect(onEdit).toHaveBeenCalledWith(ITERATION);
  });

  it('iteration 为 null 时不渲染内容', () => {
    renderDialog(
      <IterationDetailDialog
        open
        onOpenChange={vi.fn()}
        projectId="proj-1"
        iteration={null}
      />,
    );

    expect(screen.queryByText('Sprint 1')).not.toBeInTheDocument();
  });
});
