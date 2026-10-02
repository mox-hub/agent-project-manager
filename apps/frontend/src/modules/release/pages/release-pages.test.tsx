/**
 * Release 页面测试（GAP-T-22 + GAP-T-59 批三）——列表渲染/状态徽章/平台·通道徽标/
 * 计划·实际日期/即将发版区/详情门禁面板/执行日志/升级说明/交付卡 platform。
 * hooks 层整体 mock（api 经由 hooks 消费），i18n 走键名直读。
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReleaseListPage } from './release-list-page';
import { ReleaseDetailPage } from './release-detail-page';
import { deriveReleaseChannel } from '../api/release-api';

// base-ui Checkbox 点击路径依赖 window.PointerEvent（jsdom 缺失），
// 与 desktop-preferences-card.test.tsx 同解
beforeAll(() => {
  if (typeof (window as { PointerEvent?: unknown }).PointerEvent === 'undefined') {
    (window as unknown as { PointerEvent: unknown }).PointerEvent = class PointerEvent extends MouseEvent {
      pointerId: number;
      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params);
        this.pointerId = params.pointerId ?? 0;
      }
    };
  }
});

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
        'release.upcoming.title': '即将发版',
        'release.upcoming.unnamed': '未命名发版',
        'release.gate.title': '发布门禁',
        'release.gate.notRun': '尚未提交门禁',
        'release.gate.skippedEmptyScope': '范围内无内容，跳过',
        'release.action.title': '审批与发布',
        'release.detail.logTitle': '发布执行日志',
        'release.detail.loading': '发版详情',
        'release.detail.planned': '计划发版',
        'release.detail.hotfixOf': '修复自',
        'release.detail.upgradeNotes': '升级注意事项',
        'release.detail.upgradeNotesAdd': '补充升级说明',
        'release.detail.upgradeNotesEmpty': '暂无升级注意事项',
        'release.deliverables.title': '交付成果清单',
        'release.deliverables.edit': '编辑清单',
        'release.deliverables.empty': '尚未登记交付成果',
        'release.create.basis': '基线 {{base}}',
        'release.create.open': '创建发版',
        'release.create.plannedAt': '计划发版时间',
        'release.create.plannedAtPlaceholder': '选择日期',
        'release.create.hotfixOf': '热修基线',
        'release.create.hotfixNone': '非热修',
        'release.create.platforms': '发布平台',
        'release.create.submit': '创建草案',
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
  // 真实 src/i18n 入口会 .use(initReactI18next)，mock 缺该导出会在模块加载期炸
  initReactI18next: { type: '3rdParty', init: () => {} },
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
  // 创建对话框的「所属里程碑」下拉数据源（CAP-A-16）；ms-2 带 targetDate 供计划时间预填断言
  useProjectMilestones: () => ({
    data: [
      { id: 'ms-1', name: 'MVP', status: 'reached', targetDate: null },
      {
        id: 'ms-2',
        name: '公开上线',
        status: 'planned',
        targetDate: '2026-11-01T00:00:00Z',
      },
    ],
    isLoading: false,
  }),
  useProjectIterations: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/modules/assistant/api/assistant-api', () => ({
  assistantApi: { silent: vi.fn() },
}));

const detailState: { release?: Record<string, unknown> } = {};
/** 列表数据可变槽（各用例注入不同平台/通道/计划时间组合） */
const listState: { releases?: Array<Record<string, unknown>> } = {};
/** 创建/更新 mutation 的 mutate 间谍（载荷断言用） */
const createMutate = vi.fn();
const updateMutate = vi.fn();

vi.mock('../hooks/use-releases', () => ({
  useReleases: () => ({ data: listState.releases, isLoading: false }),
  useRelease: () => ({ data: detailState.release, isLoading: false }),
  useCreateRelease: () => ({ mutate: createMutate, isPending: false }),
  useUpdateRelease: () => ({ mutate: updateMutate, isPending: false }),
  useGateRelease: () => ({ mutate: vi.fn(), isPending: false }),
  useApprovalRequest: () => ({ mutate: vi.fn(), isPending: false }),
  usePublishRelease: () => ({ mutate: vi.fn(), isPending: false }),
  useRejectRelease: () => ({ mutate: vi.fn(), isPending: false }),
  useReopenRelease: () => ({ mutate: vi.fn(), isPending: false }),
  useRecommendVersion: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateDeliverables: () => ({ mutate: vi.fn(), isPending: false }),
}));

/** 列表用例的基线发版记录（released v1.0.0，与既有断言兼容） */
function baseRelease(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r-1',
    projectId: 'p-1',
    project: { id: 'p-1', name: '示例项目' },
    version: '1.0.0',
    name: '首个发版',
    status: 'released',
    gitTag: 'v1.0.0',
    milestone: { id: 'ms-9', name: '首个里程碑' },
    releasedAt: '2026-09-13T00:00:00Z',
    tagPushed: true,
    githubReleased: false,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function renderWithRouter(ui: React.ReactElement, route = '/') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ReleaseListPage', () => {
  beforeEach(() => {
    listState.releases = [baseRelease()];
  });

  it('渲染发版记录：版本/状态徽章/tag（?project 统一参数名，CAP-A-15）', () => {
    renderWithRouter(<ReleaseListPage />, '/?project=p-1');
    const versions = screen.getAllByText('v1.0.0');
    expect(versions.length).toBeGreaterThan(0);
    expect(screen.getByTitle('已发布')).toBeTruthy();
  });

  it('无 ?project 时仍渲染全部项目发版列表（不再要求先选项目）', () => {
    renderWithRouter(<ReleaseListPage />, '/');
    const versions = screen.getAllByText('v1.0.0');
    expect(versions.length).toBeGreaterThan(0);
  });

  it('列表行显示所属里程碑（CAP-A-16）', () => {
    renderWithRouter(<ReleaseListPage />, '/?project=p-1');
    expect(screen.getByText('首个里程碑')).toBeTruthy();
  });

  it('列表行渲染项目列实际名称而非关联 ID（绑定关系可读名）', () => {
    renderWithRouter(<ReleaseListPage />, '/');
    expect(screen.getByText('示例项目')).toBeTruthy();
  });

  it('列表行渲染平台徽标与预发布通道徽标，stable 不渲染通道（GAP-T-59 批三）', () => {
    listState.releases = [
      baseRelease({
        id: 'r-2',
        version: '2.0.0-beta.1',
        gitTag: null,
        status: 'draft',
        releasedAt: null,
        platforms: ['windows', 'macos', 'linux', 'android', 'ios'],
      }),
    ];
    const first = renderWithRouter(<ReleaseListPage />, '/');
    // 通道徽标由 semver 后缀推导（beta）
    expect(screen.getByText('beta')).toBeTruthy();
    // 平台 5 个 > 4 → 收敛为前 3 图标 + 溢出计数，组 title 为可读平台名
    expect(screen.getByTitle('Windows / macOS / Linux / Android / iOS')).toBeTruthy();
    expect(screen.getByText('+2')).toBeTruthy();
    // stable 版本无通道徽标
    first.unmount();
    listState.releases = [baseRelease()];
    renderWithRouter(<ReleaseListPage />, '/');
    expect(screen.queryByText('stable')).toBeNull();
  });

  it('计划发版时间：未发布且逾期标红，已发布不追诉（批三）', () => {
    listState.releases = [
      baseRelease({
        status: 'draft',
        releasedAt: null,
        gitTag: null,
        plannedAt: '2026-01-01T00:00:00Z',
      }),
    ];
    const first = renderWithRouter(<ReleaseListPage />, '/');
    // 同一计划日期同时出现在「即将发版」区与列表行，两处都应标红
    for (const el of screen.getAllByText('Jan 1')) {
      expect((el.closest('span') as HTMLElement).className).toContain('text-accent-red');
    }
    // 已发布不追诉：即将发版区不再收录（只剩列表行一处），且不标红
    first.unmount();
    listState.releases = [baseRelease({ plannedAt: '2026-01-01T00:00:00Z' })];
    renderWithRouter(<ReleaseListPage />, '/');
    const releasedPlanned = screen.getByText('Jan 1').closest('span') as HTMLElement;
    expect(releasedPlanned.className).not.toContain('text-accent-red');
  });

  it('即将发版区：未发布且有计划时间的发版按计划升序预告；全已发布则整块不渲染（批三）', () => {
    listState.releases = [
      baseRelease({
        id: 'r-3',
        version: '2.0.0',
        name: '大版本',
        status: 'gated',
        plannedAt: '2026-12-01T00:00:00Z',
        releasedAt: null,
        gitTag: null,
      }),
      baseRelease({
        id: 'r-2',
        version: '1.1.0',
        name: '次版本',
        status: 'draft',
        plannedAt: '2026-10-20T00:00:00Z',
        releasedAt: null,
        gitTag: null,
      }),
    ];
    const first = renderWithRouter(<ReleaseListPage />, '/');
    expect(screen.getByText('即将发版')).toBeTruthy();
    // 升序：1.1.0（10-20）在 2.0.0（12-01）前
    const upcoming = screen.getByLabelText('即将发版');
    const order = Array.from(upcoming.querySelectorAll('button')).map((b) =>
      b.textContent,
    );
    expect(order[0]).toContain('v1.1.0');
    expect(order[1]).toContain('v2.0.0');
    // 全部已发布 → 整块不渲染
    first.unmount();
    listState.releases = [baseRelease()];
    renderWithRouter(<ReleaseListPage />, '/');
    expect(screen.queryByText('即将发版')).toBeNull();
  });

  it('创建对话框可选所属里程碑（CAP-A-16 计划-交付轴）', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ReleaseListPage />, '/?project=p-1');
    await user.click(screen.getByText('创建发版'));
    expect(screen.getByText('所属里程碑（可选）')).toBeTruthy();
    // 里程碑下拉（SelectField=base-ui 封装，trigger 为 BUTTON，jsdom 下用键盘开层）
    const milestoneTrigger = document.querySelector(
      '[data-testid="release-milestone-select"] [data-slot="select-field"]',
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

  it('创建对话框：平台多选与热修基线入载荷（GAP-T-59 批三）', async () => {
    const user = userEvent.setup();
    listState.releases = [baseRelease()];
    renderWithRouter(<ReleaseListPage />, '/?project=p-1');
    await user.click(screen.getByText('创建发版'));
    // 版本必填
    await user.type(screen.getByPlaceholderText('1.0.0'), '2.0.0');
    // 热修基线下拉默认「非热修」，候选来自同项目已发布发版（打开弹层可见 v1.0.0）
    const hotfixTrigger = document.querySelector(
      '[data-testid="release-hotfix-select"] [data-slot="select-field"]',
    ) as HTMLElement | null;
    expect(hotfixTrigger).toBeTruthy();
    expect(hotfixTrigger.textContent).toContain('非热修');
    hotfixTrigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(await screen.findByText(/v1\.0\.0 首个发版/)).toBeTruthy();
    // 平台多选：勾选 Windows + Web（base-ui Checkbox 渲染 role=checkbox 按钮）
    const platformChecks = document.querySelectorAll(
      '[data-testid="release-platform-checks"] [role="checkbox"]',
    );
    expect(platformChecks.length).toBe(6);
    // 枚举顺序 android,ios,windows,macos,linux,web → 勾第 3、6 个
    await user.click(platformChecks[2] as HTMLElement);
    await user.click(platformChecks[5] as HTMLElement);
    // 提交（计划时间预填链路依赖真实日历弹层，jsdom 成本高，载荷断言覆盖
    // platforms/hotfixOfId；plannedAt 预填逻辑由 handleMilestoneChange 单线保证）
    await user.click(screen.getByText('创建草案'));
    expect(createMutate).toHaveBeenCalledTimes(1);
    const payload = createMutate.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.version).toBe('2.0.0');
    expect(payload.platforms).toEqual(['windows', 'web']);
    expect(payload.hotfixOfId).toBeNull();
  });
});

describe('deriveReleaseChannel（版本通道推导，批三）', () => {
  it('semver 预发布后缀推导 alpha/beta/rc，其余回落 stable', () => {
    expect(deriveReleaseChannel('1.2.3-alpha.1')).toBe('alpha');
    expect(deriveReleaseChannel('1.2.3-beta')).toBe('beta');
    expect(deriveReleaseChannel('1.2.3-rc.2')).toBe('rc');
    expect(deriveReleaseChannel('1.2.3')).toBe('stable');
    expect(deriveReleaseChannel('2.0.0-Alpha.1')).toBe('alpha');
    expect(deriveReleaseChannel('not-a-version')).toBe('stable');
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

  it('空范围跳过的检查项统一中性渲染（ci/audit 不再红、acceptance 不再绿）', () => {
    detailState.release = {
      id: 'r-1',
      projectId: 'p-1',
      version: '1.2.0',
      status: 'gated',
      tagPushed: false,
      githubReleased: false,
      gateResult: {
        passed: false,
        ranAt: '2026-09-12T00:00:00Z',
        checks: [
          {
            key: 'scope',
            label: '发布范围',
            passed: false,
            detail: '发布范围为空——请先圈定纳入本版本的工单',
          },
          {
            key: 'acceptance',
            label: '验收全绿',
            passed: true,
            detail: '范围内 0 条工单验收全部通过或豁免',
          },
          { key: 'ci', label: 'CI 证据', passed: false, detail: '范围为空，跳过' },
          { key: 'contract', label: '契约绑定', passed: true, detail: '绑定无失联' },
          { key: 'audit', label: '完整性审计', passed: false, detail: '范围为空，跳过' },
          {
            key: 'changelog',
            label: 'CHANGELOG 一致性',
            passed: true,
            detail: '项目无工作区，发布时将诚实跳过导出',
          },
        ],
      },
    };
    renderWithRouter(<ReleaseDetailPage />, '/r-1');

    // 统一跳过文案（acceptance/ci/audit 三项均替换为同一条）
    expect(screen.getAllByText('范围内无内容，跳过')).toHaveLength(3);
    // 真实失败仍红（scope）、真实通过仍绿（contract）
    const rowOf = (label: string) =>
      screen.getByText(label).closest('li') as HTMLElement;
    expect(rowOf('发布范围').className).not.toContain('text-content-text-muted');
    expect(rowOf('契约绑定').className).not.toContain('text-content-text-muted');
    // 跳过态三项行级中性（灰），图标为虚线圈而非红 X / 绿勾
    for (const label of ['验收全绿', 'CI 证据', '完整性审计', 'CHANGELOG 一致性']) {
      const row = rowOf(label);
      expect(row.className).toContain('text-content-text-muted');
      expect(row.querySelector('.text-accent-red')).toBeNull();
      expect(row.querySelector('.text-accent-green')).toBeNull();
      expect(row.innerHTML).toContain('circle-dashed');
    }
    // 无工作区跳过保留服务端自述 detail
    expect(screen.getByText('项目无工作区，发布时将诚实跳过导出')).toBeTruthy();
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

  it('详情 meta 渲染计划发版/热修血缘/平台徽标，升级说明有内容即展示（GAP-T-59 批三）', () => {
    detailState.release = {
      id: 'r-1',
      projectId: 'p-1',
      version: '1.3.0',
      status: 'released',
      tagPushed: true,
      githubReleased: false,
      plannedAt: '2026-11-15T00:00:00Z',
      releasedAt: '2026-11-16T00:00:00Z',
      platforms: ['windows', 'web'],
      hotfixOfId: 'r-0',
      hotfixOf: { id: 'r-0', version: '1.2.0', name: '上个版本' },
      upgradeNotes: '需要先迁移数据库至 2026-11 schema',
    };
    renderWithRouter(<ReleaseDetailPage />, '/r-1');
    expect(screen.getByText(/计划发版/)).toBeTruthy();
    expect(screen.getByText(/修复自/)).toBeTruthy();
    expect(screen.getByText('v1.2.0')).toBeTruthy();
    expect(screen.getByTitle('Windows / Web')).toBeTruthy();
    expect(screen.getByText('升级注意事项')).toBeTruthy();
    expect(screen.getByText(/迁移数据库/)).toBeTruthy();
    // released 态没有编辑入口（仅草案可补）
    expect(screen.queryByText('补充升级说明')).toBeNull();
  });

  it('草案态升级说明：空态提示 + 补充编辑保存走 updateDraft（GAP-T-59 批三）', async () => {
    const user = userEvent.setup();
    detailState.release = {
      id: 'r-9',
      projectId: 'p-1',
      version: '2.0.0',
      status: 'draft',
      tagPushed: false,
      githubReleased: false,
      upgradeNotes: null,
    };
    renderWithRouter(<ReleaseDetailPage />, '/r-9');
    expect(screen.getByText('暂无升级注意事项')).toBeTruthy();
    await user.click(screen.getByText('补充升级说明'));
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    await user.type(textarea, '破坏性变更：配置文件格式迁移');
    await user.click(screen.getByText('common.save'));
    expect(updateMutate).toHaveBeenCalledWith(
      { upgradeNotes: '破坏性变更：配置文件格式迁移' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('交付清单行渲染所属平台徽标（批三 platform 列）', () => {
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
            name: '桌面安装包',
            location: 'github.com/mox-hub/apm/releases',
            howToVerify: '安装后登录成功',
            platform: 'windows',
          },
        ],
      },
    };
    renderWithRouter(<ReleaseDetailPage />, '/r-1');
    expect(screen.getByText('桌面安装包')).toBeTruthy();
    expect(screen.getByText('Windows')).toBeTruthy();
  });
});
