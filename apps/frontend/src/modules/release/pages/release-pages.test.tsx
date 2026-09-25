/**
 * Release 页面测试（GAP-T-22）——列表渲染/状态徽章/详情门禁面板/执行日志。
 * hooks 层整体 mock（api 经由 hooks 消费），i18n 走键名直读。
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
        'release.deliverables.title': '交付成果清单',
        'release.deliverables.edit': '编辑清单',
        'release.deliverables.empty': '尚未登记交付成果',
        'release.create.basis': '基线 {{base}}',
        'release.create.open': '创建发版',
        'release.create.milestoneLabel': '所属里程碑（可选）',
        'release.create.milestoneNone': '不关联里程碑',
        'release.table.milestone': '里程碑',
        'release.table.project': '项目',
        'release.detail.project': '所属项目',
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
  // 创建对话框的「所属里程碑」下拉数据源（CAP-A-16）
  useProjectMilestones: () => ({
    data: [
      { id: 'ms-1', name: 'MVP', status: 'reached', targetDate: null },
      { id: 'ms-2', name: '公开上线', status: 'planned', targetDate: null },
    ],
    isLoading: false,
  }),
  useProjectIterations: () => ({ data: [], isLoading: false }),
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
        project: { id: 'p-1', name: '示例项目' },
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
  useUpdateDeliverables: () => ({ mutate: vi.fn(), isPending: false }),
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
  it('渲染发版记录：版本/状态徽章/tag（?project 统一参数名，CAP-A-15）', () => {
    renderWithRouter(<ReleaseListPage />, '/?project=p-1');
    const versions = screen.getAllByText('v1.0.0');
    expect(versions.length).toBeGreaterThan(0);
    expect(screen.getByText('已发布')).toBeTruthy();
  });

  it('无 ?project 时仍渲染全部项目发版列表（不再要求先选项目）', () => {
    renderWithRouter(<ReleaseListPage />, '/');
    const versions = screen.getAllByText('v1.0.0');
    expect(versions.length).toBeGreaterThan(0);
  });

  it('列表行显示所属里程碑列（CAP-A-16）', () => {
    renderWithRouter(<ReleaseListPage />, '/?project=p-1');
    expect(screen.getByText('里程碑')).toBeTruthy();
  });

  it('列表行渲染项目列实际名称而非关联 ID（绑定关系可读名）', () => {
    renderWithRouter(<ReleaseListPage />, '/');
    expect(screen.getByText('项目')).toBeTruthy();
    expect(screen.getByText('示例项目')).toBeTruthy();
  });

  it('创建对话框可选所属里程碑（CAP-A-16 计划-交付轴）', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ReleaseListPage />, '/?project=p-1');
    await user.click(screen.getByText('创建发版'));
    expect(screen.getByText('所属里程碑（可选）')).toBeTruthy();
    // 里程碑下拉（NativeSelect=base-ui 封装，trigger 为 BUTTON，jsdom 下用键盘开层）
    const milestoneTrigger = document.querySelector(
      '[data-testid="release-milestone-select"] [data-slot="native-select"]',
    ) as HTMLElement;
    expect(milestoneTrigger).toBeTruthy();
    expect(milestoneTrigger.textContent).toContain('不关联里程碑');
    milestoneTrigger.focus();
    await user.keyboard('{ArrowDown}');
    // 打开弹层后该项目的里程碑出现在选项中（MVP/公开上线来自 useProjectMilestones mock）
    expect(await screen.findByText('MVP')).toBeTruthy();
    expect(await screen.findByText('公开上线')).toBeTruthy();
    expect(
      document.querySelectorAll('[data-testid="release-milestone-select"]')
        .length,
    ).toBe(1);
  });
});

describe('ReleaseDetailPage', () => {
  it('渲染门禁面板检查项与执行日志（skipped 诚实展示）', () => {
    detailState.release = {
      id: 'r-1',
      projectId: 'p-1',
      project: { id: 'p-1', name: '示例项目' },
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
    // 项目名行：{label}: {name} 插值拆成多段 text node，用正则匹配整行文本
    expect(screen.getByText(/所属项目/)).toBeTruthy();
    expect(screen.getByText(/示例项目/)).toBeTruthy();
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

  it('渲染交付成果清单：名称/在哪拿/怎么验证/限制/接收人（CAP-K-03 批二）', () => {
    detailState.release = {
      id: 'r-1',
      projectId: 'p-1',
      version: '1.2.0',
      status: 'released',
      tagPushed: true,
      githubReleased: false,
      deliverables: {
        items: [
          {
            name: '桌面安装包 v1.2.0',
            location: 'github.com/mox-hub/apm/releases/tag/v1.2.0',
            howToVerify: '安装后登录成功，验收单全绿',
            limitations: '仅支持 x64',
            receiver: '运维值班',
          },
        ],
        updatedBy: 'user-1',
        updatedAt: '2026-09-17T00:00:00Z',
      },
    };
    renderWithRouter(<ReleaseDetailPage />, '/r-1');
    expect(screen.getByText('交付成果清单')).toBeTruthy();
    expect(screen.getByText('桌面安装包 v1.2.0')).toBeTruthy();
    expect(
      screen.getByText(/github\.com\/mox-hub\/apm\/releases\/tag\/v1\.2\.0/),
    ).toBeTruthy();
    expect(screen.getByText(/安装后登录成功/)).toBeTruthy();
    expect(screen.getByText(/仅支持 x64/)).toBeTruthy();
    expect(screen.getByText(/运维值班/)).toBeTruthy();
    expect(screen.getByText('编辑清单')).toBeTruthy();
  });

  it('交付成果清单空态文案（尚未登记时不渲染编辑行）', () => {
    detailState.release = {
      id: 'r-1',
      projectId: 'p-1',
      version: '1.2.0',
      status: 'released',
      tagPushed: true,
      githubReleased: false,
      deliverables: null,
    };
    renderWithRouter(<ReleaseDetailPage />, '/r-1');
    expect(screen.getByText('交付成果清单')).toBeTruthy();
    expect(screen.getByText('尚未登记交付成果')).toBeTruthy();
  });
});
