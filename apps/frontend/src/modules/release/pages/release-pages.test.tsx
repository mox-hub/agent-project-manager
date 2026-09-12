/**
 * Release 页面测试（GAP-T-22）——列表渲染/状态徽章/详情门禁面板/执行日志。
 * hooks 层整体 mock（api 经由 hooks 消费），i18n 走键名直读。
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReleaseListPage } from './release-list-page';
import { ReleaseDetailPage } from './release-detail-page';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      const translations: Record<string, string> = {
        'release.title': '发版交付',
        'release.filter.pickProject': '选择项目…',
        'release.empty.pickProject': '先选择一个项目',
        'release.status.draft': '草案',
        'release.status.gated': '门禁通过',
        'release.status.released': '已发布',
        'release.gate.title': '发布门禁',
        'release.gate.notRun': '尚未提交门禁',
        'release.action.title': '审批与发布',
        'release.detail.logTitle': '发布执行日志',
        'release.detail.loading': '发版详情',
        'release.create.basis': '基线 {{base}}',
      };
      const base = translations[key] ?? key;
      return base.replace('{{base}}', opts?.base ?? '');
    },
  }),
}));

vi.mock('@/infrastructure/event-client', () => ({
  eventClient: { on: vi.fn(), off: vi.fn() },
}));

vi.mock('@/modules/project/hooks/use-project-list', () => ({
  useProjectList: () => ({
    data: { items: [{ id: 'p-1', name: '示例项目' }], total: 1 },
    isLoading: false,
  }),
}));

vi.mock('@/modules/issue/hooks/use-project-tasks', () => ({
  useProjectTasks: () => ({ data: { data: [] }, isLoading: false }),
}));

vi.mock('@/modules/assistant/api/assistant-api', () => ({
  assistantApi: { silent: vi.fn() },
}));

const detailState: { release?: Record<string, unknown> } = {};

vi.mock('../hooks/use-releases', () => ({
  useReleases: () => ({
    data: [
      {
        id: 'r-1',
        projectId: 'p-1',
        version: '1.0.0',
        name: '首个发版',
        status: 'released',
        gitTag: 'v1.0.0',
        releasedAt: '2026-09-13T00:00:00Z',
        tagPushed: true,
        githubReleased: false,
        createdAt: '',
        updatedAt: '',
      },
    ],
    isLoading: false,
  }),
  useRelease: () => ({ data: detailState.release, isLoading: false }),
  useCreateRelease: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateRelease: () => ({ mutate: vi.fn(), isPending: false }),
  useGateRelease: () => ({ mutate: vi.fn(), isPending: false }),
  useApprovalRequest: () => ({ mutate: vi.fn(), isPending: false }),
  usePublishRelease: () => ({ mutate: vi.fn(), isPending: false }),
  useRejectRelease: () => ({ mutate: vi.fn(), isPending: false }),
  useReopenRelease: () => ({ mutate: vi.fn(), isPending: false }),
  useRecommendVersion: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderWithRouter(ui: React.ReactElement, route = '/') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ReleaseListPage', () => {
  it('渲染发版记录：版本/状态徽章/tag', () => {
    renderWithRouter(<ReleaseListPage />, '/?projectId=p-1');
    const versions = screen.getAllByText('v1.0.0');
    expect(versions.length).toBeGreaterThan(0);
    expect(screen.getByText('已发布')).toBeTruthy();
  });

  it('未选项目时渲染空态引导', () => {
    renderWithRouter(<ReleaseListPage />, '/');
    expect(screen.getByText('先选择一个项目')).toBeTruthy();
  });
});

describe('ReleaseDetailPage', () => {
  it('渲染门禁面板检查项与执行日志（skipped 诚实展示）', () => {
    detailState.release = {
      id: 'r-1',
      projectId: 'p-1',
      version: '1.2.0',
      status: 'released',
      notes: '说明文本',
      gitTag: 'v1.2.0',
      tagPushed: true,
      githubReleased: false,
      releasedAt: '2026-09-13T00:00:00Z',
      gateResult: {
        passed: true,
        ranAt: '2026-09-12T00:00:00Z',
        checks: [
          { key: 'scope', label: '发布范围', passed: true, detail: 'ok' },
          { key: 'acceptance', label: '验收全绿', passed: true, detail: 'ok' },
          { key: 'ci', label: 'CI 证据', passed: false, detail: '存在失败结论' },
        ],
      },
      executionLog: [
        { step: 'changelog', status: 'skipped', detail: '无工作区', at: '' },
        { step: 'tag', status: 'skipped', detail: '无工作区', at: '' },
        { step: 'github-release', status: 'skipped', detail: '无集成', at: '' },
      ],
    };
    renderWithRouter(<ReleaseDetailPage />, '/r-1');
    expect(screen.getByText('发布门禁')).toBeTruthy();
    expect(screen.getByText('存在失败结论')).toBeTruthy();
    expect(screen.getByText('发布执行日志')).toBeTruthy();
    expect(screen.getByText('github-release')).toBeTruthy();
    expect(screen.getByText('说明文本')).toBeTruthy();
  });

  it('gated 态渲染审批动作按钮', () => {
    detailState.release = {
      id: 'r-1',
      projectId: 'p-1',
      version: '1.2.0',
      status: 'gated',
      gateResult: { passed: true, ranAt: '', checks: [] },
      tagPushed: false,
      githubReleased: false,
    };
    renderWithRouter(<ReleaseDetailPage />, '/r-1');
    expect(screen.getByText('release.action.requestApproval')).toBeTruthy();
    expect(screen.getByText('release.action.reject')).toBeTruthy();
  });
});
