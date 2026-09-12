/**
 * 初始化向导测试：
 * ① 步骤构建——桌面模式工作目录步骤插入（GAP-T-20）。回归背景：首版实机
 *    冒烟发现桌面模式向导仍是 5 步——DESKTOP_EXTRA_STEPS 以步骤自身 id 为
 *    key 而查找用锚点 id，插入永不命中。
 * ② 完成/建项回归（2026-09-12 实机暴露）——向导 API 层曾指向服务端从未实现
 *    的 /onboarding/* 五端点（恒 404）：「进入 APM」静默失败无法进入；建项
 *    提交永远不前进。修复后 finish 纯前端/壳侧完成（零网络依赖）、建项落
 *    真实 POST /projects 契约端点。
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';

const isTauriAvailableMock = vi.hoisted(() => vi.fn(() => false));
const postMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());
const setOnboardingCompletedMock = vi.hoisted(() => vi.fn());
const persistOnboardingMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/types/electron-api', () => ({
  isTauriAvailable: () => isTauriAvailableMock(),
  invoke: vi.fn(),
}));

vi.mock('@/infrastructure/api-client', () => ({
  api: {
    get: vi.fn(),
    post: postMock,
  },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@/infrastructure/store/app-store', () => ({
  useAppStore: () => ({ setOnboardingCompleted: setOnboardingCompletedMock }),
}));

vi.mock('@/shared/lib/desktop-session', () => ({
  persistOnboardingToShell: persistOnboardingMock,
}));

const { buildSteps, useOnboarding } = await import('./use-onboarding');
const { onboardingApi } = await import('../api/onboarding-api');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  postMock.mockReset();
  navigateMock.mockClear();
  setOnboardingCompletedMock.mockClear();
  persistOnboardingMock.mockClear();
});

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

describe('finishOnboarding（进入 APM 回归）', () => {
  it('完成是纯前端/壳侧动作：置标记、镜像壳侧、跳 /app，零网络依赖', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper: createWrapper() });

    act(() => {
      result.current.finishOnboarding.mutate();
    });

    expect(setOnboardingCompletedMock).toHaveBeenCalledWith(true);
    expect(persistOnboardingMock).toHaveBeenCalledWith(true);
    expect(navigateMock).toHaveBeenCalledWith('/app');
    // 修复前：调 POST /onboarding/finish（服务端从未实现，404 静默）→ 按钮无反应
    expect(postMock).not.toHaveBeenCalled();
  });
});

describe('onboardingApi.createProject（建项目走真实契约端点）', () => {
  it('POST /projects 并补齐契约必填默认值（type/visibility）', async () => {
    postMock.mockResolvedValue({ id: 'p-1', name: '我的项目' });

    const project = await onboardingApi.createProject({ name: '我的项目' });

    expect(project).toEqual({ id: 'p-1', name: '我的项目' });
    expect(postMock).toHaveBeenCalledWith(
      '/projects',
      expect.objectContaining({
        name: '我的项目',
        type: 'team',
        visibility: 'internal',
      }),
    );
  });
});
