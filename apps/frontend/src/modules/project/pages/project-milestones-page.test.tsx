/**
 * 里程碑与发布时间轴（CAP-A-16）测试：
 * 时间轴渲染迭代区间条 + 里程碑五态节点 + 关联发布标记；无日期里程碑进未计划区；空态。
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectMilestonesPage } from './project-milestones-page';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'project.detail.milestones': '里程碑与发布',
        'project.detail.notFound': '项目不存在',
        'project.detail.milestonesDesc': '已完成 {{completed}} / {{total}} 个里程碑',
        'project.detail.newMilestone': '新建里程碑',
        'project.milestonesPage.loadFailed': '无法加载里程碑列表',
        'project.milestonesPage.empty': '暂无里程碑。',
        'project.milestonesPage.notSet': '未设置',
        'project.milestonesPage.targetDate': '目标日期：',
        'project.milestonesPage.taskCount': '{{count}} 个任务',
        'project.milestonesPage.unscheduled': '未计划',
        'project.milestonesPage.unscheduledDesc': '未设置目标日期的里程碑。',
        'project.milestonesPage.status.planned': '待启动',
        'project.milestonesPage.status.inProgress': '进行中',
        'project.milestonesPage.status.reached': '已达成',
        'project.milestonesPage.status.missed': '已错过',
        'project.milestonesPage.status.cancelled': '已取消',
        'release.status.released': '已发布',
        'release.status.draft': '草案',
      };
      let base = translations[key] ?? key;
      if (opts) {
        for (const [k, v] of Object.entries(opts)) {
          base = base.replace(`{{${k}}}`, String(v));
        }
      }
      return base;
    },
  }),
}));

vi.mock('../hooks/use-project-dashboard-summary', () => ({
  useProjectDashboardSummary: () => ({
    data: {
      projectMeta: {
        id: 'p1',
        name: 'Nebula Core',
        startDate: '2026-08-01T00:00:00Z',
        targetDate: '2026-12-31T00:00:00Z',
      },
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

const milestonesState: { data?: unknown } = {};
const iterationsState: { data?: unknown } = {};

vi.mock('@/modules/issue/hooks/use-project-tasks', () => ({
  useProjectMilestones: () => ({ ...milestonesState, isLoading: false }),
  useProjectIterations: () => ({ ...iterationsState, isLoading: false }),
}));

vi.mock('../components/dashboard/project-detail-frame', () => ({
  ProjectDetailFrame: ({ children }: { children?: ReactNode }) => (
    <div data-testid="project-detail-frame">{children}</div>
  ),
}));

vi.mock('@/shared/components/create-dialog', () => ({
  UnifiedCreateDialog: () => <div data-testid="unified-create-dialog" />,
}));

vi.mock('@/shared/ai/identifiers', () => ({
  CORE_AI_PAGE_IDS: { projectMilestones: 'project-milestones' },
}));

function renderPage(route = '/app/projects/p1/milestones') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/app/projects/:projectId/milestones" element={<ProjectMilestonesPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProjectMilestonesPage（里程碑与发布时间轴）', () => {
  it('时间轴渲染里程碑五态节点与关联发布标记', () => {
    milestonesState.data = [
      {
        id: 'ms-1',
        name: 'MVP',
        status: 'reached',
        targetDate: '2026-09-01T00:00:00Z',
        description: '首个可用版本',
        taskCount: 3,
        tasks: [],
        releases: [
          {
            id: 'r-1',
            version: '0.1.0',
            status: 'released',
            releasedAt: '2026-09-01T00:00:00Z',
          },
        ],
      },
      {
        id: 'ms-2',
        name: '公开上线',
        status: 'in_progress',
        targetDate: '2026-10-01T00:00:00Z',
        description: null,
        taskCount: 0,
        tasks: [],
        releases: [],
      },
    ];
    iterationsState.data = [];

    renderPage();
    // 里程碑节点：名称 + 五态徽标 + 描述
    expect(screen.getByText('MVP')).toBeTruthy();
    expect(screen.getByText('已达成')).toBeTruthy();
    expect(screen.getByText('进行中')).toBeTruthy();
    expect(screen.getByText('首个可用版本')).toBeTruthy();
    // 关联发布标记：版本号 + 发布状态徽标
    expect(screen.getByText('v0.1.0')).toBeTruthy();
    expect(screen.getByText('已发布')).toBeTruthy();
  });

  it('时间轴渲染迭代区间条（名称 + 起止 + 容量）', () => {
    milestonesState.data = [];
    iterationsState.data = [
      {
        id: 'it-1',
        name: 'Sprint 1',
        status: 'in_progress',
        startDate: '2026-09-01T00:00:00Z',
        endDate: '2026-09-14T00:00:00Z',
        _count: { issues: 5 },
      },
    ];

    renderPage();
    expect(screen.getByText('Sprint 1')).toBeTruthy();
    expect(screen.getByText('5 个任务')).toBeTruthy();
  });

  it('无 targetDate 的里程碑排入未计划区', () => {
    milestonesState.data = [
      {
        id: 'ms-x',
        name: '远期构想',
        status: 'planned',
        targetDate: null,
        description: null,
        taskCount: 0,
        tasks: [],
        releases: [],
      },
    ];
    iterationsState.data = [];

    renderPage();
    expect(screen.getByText('未计划')).toBeTruthy();
    expect(screen.getByText('远期构想')).toBeTruthy();
    expect(screen.getByText('待启动')).toBeTruthy();
  });

  it('无里程碑与迭代时渲染空态', () => {
    milestonesState.data = [];
    iterationsState.data = [];

    renderPage();
    expect(screen.getByText('暂无里程碑。')).toBeTruthy();
  });
});
