/**
 * OnboardingGate 门控回归（P2-27）：
 * - 历史行为：仅桌面壳渲染向导，Web 注册后直达空仪表盘零引导；
 * - 修复后：只看完成标记（zustand persist），Web 与桌面一致弹出；
 * - 完成后不再渲染。向导本体由 use-onboarding.test 覆盖，这里只测门控。
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingGate } from './onboarding-gate';

const onboardingCompleted = vi.hoisted(() => ({ value: false }));

vi.mock('@/infrastructure/store/app-store', () => ({
  useAppStore: (selector: (state: { onboardingCompleted: boolean }) => boolean) =>
    selector({ onboardingCompleted: onboardingCompleted.value }),
}));

vi.mock('../pages/onboarding-wizard', () => ({
  OnboardingWizard: () => <div data-testid="onboarding-wizard">wizard</div>,
}));

describe('OnboardingGate', () => {
  it('未完成时渲染向导（Web 无桌面壳桥也渲染——P2-27 回归）', () => {
    onboardingCompleted.value = false;
    render(<OnboardingGate />);
    expect(screen.getByTestId('onboarding-wizard')).toBeTruthy();
  });

  it('完成后返回 null，不再打扰', () => {
    onboardingCompleted.value = true;
    const { container } = render(<OnboardingGate />);
    expect(container.querySelector('[data-testid="onboarding-wizard"]')).toBeNull();
  });
});
