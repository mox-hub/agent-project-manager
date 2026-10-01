/**
 * 向导 i18n 结构性回归（CAP-A-18 上手引导收口）：
 * 历史违规——onboarding-wizard.tsx 全量硬编码中文、零 react-i18next import，
 * 是仓库 i18n 纪律的漏网之鱼。本测试用「透传键名」mock（run-isolation-badge.test.tsx
 * 同款）做结构性断言：渲染后文本只允许是 i18n 键名，出现任何中文字符即失败——
 * 这样将来再有人硬编码文案，测试直接红。
 * 同时覆盖内容同步两处新卡：Welcome 数据安全卡 / Complete 决策收件箱指引卡。
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingWizard } from './onboarding-wizard';

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

function mockStateAt(stepIndex: number) {
  useOnboardingMock.mockReturnValue({
    state: {
      currentStep: stepIndex,
      steps: steps.map((s, i) => ({
        ...s,
        status: i < stepIndex ? ('completed' as const) : i === stepIndex ? ('current' as const) : ('pending' as const),
      })),
    },
    currentStepData: steps[stepIndex],
    isLastStep: stepIndex === steps.length - 1,
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    skipStep: vi.fn(),
    finishOnboarding: { mutate: vi.fn(), isPending: false, error: null },
    watchReplayThenStart: vi.fn(),
    createProject: { mutate: vi.fn(), isPending: false, error: null },
    goToStep: vi.fn(),
  });
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
    mockStateAt(5);
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

  it('create-project 步：表单标签/占位符/类型选项全键名，零硬编码中文', () => {
    mockStateAt(2);
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
