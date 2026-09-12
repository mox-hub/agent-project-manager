/**
 * 初始化向导步骤构建测试：桌面模式工作目录步骤插入（GAP-T-20）。
 * 回归背景：首版实机冒烟发现桌面模式向导仍是 5 步——DESKTOP_EXTRA_STEPS
 * 以步骤自身 id 为 key 而查找用锚点 id，插入永不命中。
 */
import { describe, expect, it, vi } from 'vitest';

const isTauriAvailableMock = vi.hoisted(() => vi.fn(() => false));

vi.mock('@/shared/types/electron-api', () => ({
  isTauriAvailable: () => isTauriAvailableMock(),
}));

const { buildSteps } = await import('./use-onboarding');

describe('buildSteps（初始化向导步骤序列）', () => {
  it('web 模式：5 步，无工作目录步骤', () => {
    isTauriAvailableMock.mockReturnValue(false);
    const steps = buildSteps(false);
    expect(steps.map((s) => s.id)).toEqual([
      'welcome',
      'create-project',
      'connect-repository',
      'add-ai',
      'complete',
    ]);
  });

  it('桌面模式：在欢迎步骤后插入工作目录步骤（共 6 步）', () => {
    const steps = buildSteps(true);
    expect(steps.map((s) => s.id)).toEqual([
      'welcome',
      'workspace-root',
      'create-project',
      'connect-repository',
      'add-ai',
      'complete',
    ]);
    expect(steps[0].status).toBe('current');
    expect(steps[1].status).toBe('pending');
  });
});
