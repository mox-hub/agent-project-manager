/**
 * 向导 i18n 结构性回归（CAP-A-18 上手引导收口）：
 * 历史违规——onboarding-wizard.tsx 全量硬编码中文、零 react-i18next import，
 * 是仓库 i18n 纪律的漏网之鱼。本测试用「透传键名」mock（run-isolation-badge.test.tsx
 * 同款）做结构性断言：渲染后文本只允许是 i18n 键名，出现任何中文字符即失败——
 * 这样将来再有人硬编码文案，测试直接红。
 * 同时覆盖内容同步两处新卡：Welcome 数据安全卡 / Complete 决策收件箱指引卡。
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnboardingWizard } from './onboarding-wizard';
import { useAppStore } from '@/infrastructure/store/app-store';

// i18n mock 仅透传键名——断言直接对着键写，键缺失时文本即键名本身（可定位）
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      // 插值场景保留根值可读性（如 removeAria），一般场景透传键名
      key,
  }),
}));

const steps = [
  { id: 'welcome', title: 'onboarding.steps.welcome.title', description: '', status: 'current' as const },
  { id: 'workspace-root', title: 'onboarding.steps.workspaceRoot.title', description: '', status: 'pending' as const },
  { id: 'environment', title: 'onboarding.steps.environment.title', description: '', status: 'pending' as const },
  { id: 'create-project', title: 'onboarding.steps.createProject.title', description: '', status: 'pending' as const },
  { id: 'connect-repository', title: 'onboarding.steps.connectRepository.title', description: '', status: 'pending' as const },
  { id: 'add-ai', title: 'onboarding.steps.configureAi.title', description: '', status: 'pending' as const },
  { id: 'complete', title: 'onboarding.steps.complete.title', description: '', status: 'pending' as const },
];

const useOnboardingMock = vi.hoisted(() => vi.fn());

vi.mock('../hooks/use-onboarding', () => ({
  useOnboarding: () => useOnboardingMock(),
}));

vi.mock('@/shared/types/electron-api', () => ({
  invoke: vi.fn().mockResolvedValue({ roots: [], path: null }),
  isDesktopShellAvailable: () => false,
}));

// 连接仓库步接真实绑定：git-api mock 防真发请求；ai-hub hooks/api mock 供配置 AI 步
vi.mock('@/modules/git/api/git-api', () => ({
  gitApi: { getRepositories: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/modules/ai-hub/api/ai-hub-api', () => ({
  aiHubApi: {
    validateProvider: vi.fn().mockResolvedValue({ valid: true, models: ['gpt-4o'] }),
  },
}));

vi.mock('@/modules/ai-hub/hooks/use-ai-providers', () => ({
  useAiProviders: () => ({
    data: [
      { id: 'p1', provider: 'openai', providerId: 'openai', displayName: 'OpenAI', hasApiKey: false, enabled: true },
      { id: 'p2', provider: 'glm', providerId: 'glm', displayName: 'GLM', hasApiKey: true, enabled: true },
    ],
    isLoading: false,
  }),
  useUpdateProvider: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
  useSetDefaultModel: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
}));

// 环境步骤引入 provider-meta → lobehub 原生 ESM（emoji-mart JSON）在 vitest 崩——
// 结构性回归不消费品牌图标，mock 掉断链（仓库既有坑，见 lobehub-icons 记账）
vi.mock('@/shared/ai-providers/provider-meta', () => ({
  getProviderMeta: (id: string) => ({
    label: id,
    Icon: () => null,
    Color: undefined,
  }),
}));

// 工作目录步 web 变体消费 runtime 注册查询——mock 掉真发请求，注册数据按用例注入
const registrationsMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/runtime/runtime-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/runtime/runtime-api')>();
  return {
    ...actual,
    useRuntimeRegistrations: () => ({ data: registrationsMock() }),
  };
});

function mockStateAt(
  stepIndex: number,
  data: Record<string, unknown> = {},
  stepStatusOverrides: Record<number, 'skipped'> = {},
) {
  const finishToCreateAgent = vi.fn();
  useOnboardingMock.mockReturnValue({
    state: {
      currentStep: stepIndex,
      steps: steps.map((s, i) => ({
        ...s,
        status:
          stepStatusOverrides[i] ??
          (i < stepIndex ? ('completed' as const) : i === stepIndex ? ('current' as const) : ('pending' as const)),
      })),
      data,
    },
    currentStepData: steps[stepIndex],
    isLastStep: stepIndex === steps.length - 1,
    isFirstStep: stepIndex === 0,
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    skipStep: vi.fn(),
    finishOnboarding: { mutate: vi.fn(), isPending: false, error: null },
    watchReplayThenStart: vi.fn(),
    finishToCreateAgent,
    createProject: { mutate: vi.fn(), isPending: false, error: null },
    goToStep: vi.fn(),
  });
  return { finishToCreateAgent };
}

/** 结构性断言：透传键名模式下渲染区不得出现任何中文字符（硬编码文案 = 违规）。
 *  base-ui Dialog 走 Portal 挂 document.body——必须扫 baseElement 而非 container。 */
function assertNoHardcodedChinese(baseElement: HTMLElement) {
  const text = baseElement.textContent ?? '';
  const cjk = text.match(/[\u4e00-\u9fff]/g);
  expect(cjk, `发现硬编码中文字符：${cjk?.join('')}（上下文：${text.slice(0, 200)}）`).toBeNull();
}

describe('OnboardingWizard i18n 结构性回归（CAP-A-18）', () => {
  it('welcome 步：标题/按钮/特性卡全部走 t() 键名，渲染区零硬编码中文', () => {
    mockStateAt(0);
    const { baseElement } = render(<OnboardingWizard />);

    expect(screen.getByText('onboarding.welcome.title')).toBeTruthy();
    expect(screen.getByText('onboarding.welcome.subtitle')).toBeTruthy();
    // 步骤条标题键名（steps 数据已键化）
    expect(screen.getAllByText('onboarding.steps.welcome.title').length).toBeGreaterThan(0);
    // 主按钮键名
    expect(screen.getByText('onboarding.welcome.start')).toBeTruthy();
    expect(screen.getByText('onboarding.welcome.later')).toBeTruthy();
    // AI 同事说明卡
    expect(screen.getByText('onboarding.welcome.aiIntro.title')).toBeTruthy();

    // 内容同步：内测语境数据安全卡（第五张特性卡）
    expect(screen.getByText('onboarding.welcome.features.dataSafety.title')).toBeTruthy();
    // 治理闭环主叙事保留
    expect(screen.getByText('onboarding.welcome.features.governance.title')).toBeTruthy();

    assertNoHardcodedChinese(baseElement);
  });

  it('complete 步：完成指引四卡（含决策收件箱新卡）+ 三按钮全键名，零硬编码中文', () => {
    mockStateAt(6);
    const { baseElement } = render(<OnboardingWizard />);

    expect(screen.getByText('onboarding.complete.heading')).toBeTruthy();
    // 内容同步：G5-b integration 卡 = 新手第一个 AI 确认时刻
    expect(screen.getByText('onboarding.complete.inboxHint.title')).toBeTruthy();
    expect(screen.getByText('onboarding.complete.projectReady.title')).toBeTruthy();
    expect(screen.getByText('onboarding.complete.watchReplay')).toBeTruthy();
    expect(screen.getByText('onboarding.complete.enterApp')).toBeTruthy();
    expect(screen.getByText('onboarding.complete.viewDocs')).toBeTruthy();

    assertNoHardcodedChinese(baseElement);
  });

  it('complete 步（配置 AI 被跳过）：出现「创建 AI 员工」行动卡，点击走深链出口（CAP-A-18 AI 员工引导闭环）', () => {
    // 跳过路径：add-ai（index 5）置 skipped → 行动卡出现，点击调 finishToCreateAgent
    const { finishToCreateAgent } = mockStateAt(6, {}, { 5: 'skipped' });
    render(<OnboardingWizard />);

    expect(screen.getByText('onboarding.complete.createAgent.title')).toBeTruthy();
    fireEvent.click(screen.getByText('onboarding.complete.createAgent.title'));
    expect(finishToCreateAgent).toHaveBeenCalledTimes(1);
  });

  it('complete 步（配置 AI 成功路径）：行动卡不得出现——成功链已自动建员工，无补建必要', () => {
    mockStateAt(6);
    render(<OnboardingWizard />);

    expect(screen.queryByText('onboarding.complete.createAgent.title')).toBeNull();
  });

  it('complete 步（生产构建模拟）：回放 CTA 不渲染、进入 Ordo 提升为主键（CAP-C-08 形态收缩，AI 表面 DEV-only 连带）', () => {
    vi.stubEnv('DEV', false);
    try {
      mockStateAt(6);
      render(<OnboardingWizard />);

      expect(screen.queryByText('onboarding.complete.watchReplay')).toBeNull();
      expect(screen.getByText('onboarding.complete.enterApp')).toBeTruthy();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('create-project 步：表单标签/占位符/类型选项全键名，零硬编码中文', () => {
    // 桌面 7 步序（welcome/workspace-root/environment/create-project/...）中 create-project 是 index 3
    mockStateAt(3);
    const { baseElement } = render(<OnboardingWizard />);

    expect(screen.getByText('onboarding.createProject.heading')).toBeTruthy();
    expect(screen.getByText('onboarding.createProject.type.team')).toBeTruthy();
    // attr 类文案（placeholder）同样走 t() 键名（Portal 挂 body，从 baseElement 查）
    expect(
      baseElement.querySelector('input#project-name')?.getAttribute('placeholder'),
    ).toBe('onboarding.createProject.namePlaceholder');

    assertNoHardcodedChinese(baseElement);
  });
});

describe('OnboardingWizard 关闭即触及（2026-10-03 触发一次性改版）', () => {
  beforeAll(() => {
    // base-ui Dialog 关闭钮点击路径依赖 window.PointerEvent（jsdom 缺失），
    // 与 desktop-preferences-card.test.tsx 同解
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

  it('点关闭钮：未走完也落完成标记（自动触发机会即消费）+ 复位 onboardingOpen', () => {
    useAppStore.setState({ onboardingCompleted: false, onboardingOpen: true });
    mockStateAt(0);
    const { baseElement } = render(<OnboardingWizard />);

    const closeButton = baseElement.querySelector('[data-slot="dialog-close"]');
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton as HTMLElement);

    expect(useAppStore.getState().onboardingCompleted).toBe(true);
    expect(useAppStore.getState().onboardingOpen).toBe(false);
  });

  it('双栏规格：左步骤轨（7 步全渲染）+ rail 文案走 i18n 键', () => {
    useAppStore.setState({ onboardingCompleted: false, onboardingOpen: true });
    mockStateAt(0);
    render(<OnboardingWizard />);

    expect(screen.getByText('onboarding.rail.title')).toBeTruthy();
    // 步骤轨列出全部 7 步标题（桌面模式 5+2）
    for (const step of steps) {
      expect(screen.getAllByText(step.title).length).toBeGreaterThan(0);
    }
  });
});

/** 连接仓库/配置 AI/工作目录(web 变体)步消费 react-query——挂 QueryClientProvider 再渲染向导 */
function renderWizardAt(stepIndex: number, data: Record<string, unknown> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  useAppStore.setState({ onboardingCompleted: false, onboardingOpen: true });
  mockStateAt(stepIndex, data);
  return render(
    <QueryClientProvider client={queryClient}>
      <OnboardingWizard />
    </QueryClientProvider>,
  );
}

describe('OnboardingWizard 步骤真实化回归（2026-10-04 实机验收反馈）', () => {
  it('连接仓库步：有 projectId 时出真实绑定入口（复用 BindRepositoryDialog），空仓库给绑定提示', () => {
    const { baseElement } = renderWizardAt(4, { projectId: 'proj-1' });

    expect(screen.getByText('onboarding.connectRepository.bind')).toBeTruthy();
    expect(screen.getByText('onboarding.connectRepository.bindHint')).toBeTruthy();
    assertNoHardcodedChinese(baseElement);
  });

  it('连接仓库步：跳过建项目（无 projectId）回落静态指引', () => {
    renderWizardAt(4);

    expect(screen.getByText('onboarding.connectRepository.noProjectHint')).toBeTruthy();
  });

  it('配置 AI 步：厂家选卡渲染（含已配置徽注）+ 快捷配置表单入口，零硬编码中文', () => {
    const { baseElement } = renderWizardAt(5);

    expect(screen.getByText('onboarding.configureAi.quick.providerLabel')).toBeTruthy();
    // 厂家名是专有名词（ASCII 直出）；配置态徽注走键名
    expect(screen.getByText('OpenAI')).toBeTruthy();
    expect(screen.getByText('GLM (Zhipu)')).toBeTruthy();
    expect(screen.getByText('onboarding.configureAi.quick.configured')).toBeTruthy();
    expect(screen.getByText('onboarding.configureAi.quick.hint')).toBeTruthy();
    assertNoHardcodedChinese(baseElement);
  });
});

describe('OnboardingWizard 统一底部操作栏（2026-10-11 七步对齐批）', () => {
  beforeEach(() => {
    registrationsMock.mockReset().mockReturnValue([]);
  });

  it('欢迎步：底栏「稍后设置+开始设置」，上一步常驻但禁用', () => {
    renderWizardAt(0);

    expect(screen.getByText('onboarding.welcome.later')).toBeTruthy();
    expect(screen.getByText('onboarding.welcome.start')).toBeTruthy();
    const prevButton = screen.getByText('onboarding.common.prev').closest('button');
    expect(prevButton?.disabled).toBe(true);
  });

  it('中间步（创建项目）：底栏「跳过+创建项目（submit 提交表单）」，上一步可用', () => {
    renderWizardAt(3);

    expect(screen.getByText('onboarding.common.skip')).toBeTruthy();
    const submitButton = screen.getByText('onboarding.createProject.submit').closest('button');
    expect(submitButton?.getAttribute('type')).toBe('submit');
    expect(submitButton?.getAttribute('form')).toBe('onboarding-create-project-form');
    const prevButton = screen.getByText('onboarding.common.prev').closest('button');
    expect(prevButton?.disabled).toBe(false);
  });

  it('完成步不出底栏（三颗 CTA 由完成步内容自承载）', () => {
    renderWizardAt(6);

    expect(screen.queryByText('onboarding.common.skip')).toBeNull();
    expect(screen.queryByText('onboarding.common.next')).toBeNull();
    expect(screen.queryByText('onboarding.common.prev')).toBeNull();
  });

  it('工作目录步（web 无壳）：无在线运行时给诚实空态指引，不出桌面选择器', () => {
    const { baseElement } = renderWizardAt(1);

    expect(screen.getByText('onboarding.workspaceRoot.webHint')).toBeTruthy();
    expect(screen.getByText('onboarding.workspaceRoot.webEmpty')).toBeTruthy();
    expect(screen.queryByText('onboarding.workspaceRoot.choose')).toBeNull();
    assertNoHardcodedChinese(baseElement);
  });

  it('工作目录步（web 无壳）：有在线注册时只读列出其机器与工作目录', () => {
    registrationsMock.mockReturnValue([
      {
        runtimeId: 'rt-1',
        deviceId: 'device-TESTBOX',
        status: 'online',
        workspaceRoots: ['D:\\ws'],
      },
    ]);
    renderWizardAt(1);

    expect(screen.getByText('onboarding.workspaceRoot.webRegistered')).toBeTruthy();
    expect(screen.getByText('TESTBOX')).toBeTruthy();
    expect(screen.getByText('D:\\ws')).toBeTruthy();
    expect(screen.queryByText('onboarding.workspaceRoot.webEmpty')).toBeNull();
  });
});
