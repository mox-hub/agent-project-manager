/**
 * OnboardingGate 门控回归（P2-27 Web 同弹；2026-10-03 触发一次性改版）：
 * - 未完成时自动弹出（Web 与桌面一致）；
 * - 完成后不再渲染；
 * - onboardingOpen（侧边栏「引导」手动重开开关）可在完成后临时唤起向导；
 * - 触发一次性语义：关闭即触及在向导自身 handleDismiss 落标记（wizard 测试覆盖），
 *   这里只测门控读取侧。
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingGate } from './onboarding-gate';

const gateState = vi.hoisted(() => ({
  onboardingCompleted: false,
  onboardingOpen: false,
}));

vi.mock('@/infrastructure/store/app-store', () => ({
  useAppStore: (selector: (state: typeof gateState) => unknown) =>
    selector(gateState),
}));

vi.mock('../pages/onboarding-wizard', () => ({
  OnboardingWizard: () => <div data-testid="onboarding-wizard">wizard</div>,
}));

describe('OnboardingGate', () => {
  it('未完成时渲染向导（Web 无桌面壳桥也渲染——P2-27 回归）', () => {
    gateState.onboardingCompleted = false;
    gateState.onboardingOpen = false;
    render(<OnboardingGate />);
    expect(screen.getByTestId('onboarding-wizard')).toBeTruthy();
  });

  it('完成后返回 null，不再打扰（一台机器主动触及一次）', () => {
    gateState.onboardingCompleted = true;
    gateState.onboardingOpen = false;
    const { container } = render(<OnboardingGate />);
    expect(container.querySelector('[data-testid="onboarding-wizard"]')).toBeNull();
  });

  it('完成后 onboardingOpen=true（侧边栏「引导」点击）重新唤起向导', () => {
    gateState.onboardingCompleted = true;
    gateState.onboardingOpen = true;
    render(<OnboardingGate />);
    expect(screen.getByTestId('onboarding-wizard')).toBeTruthy();
  });
});
