/**
 * 初始化向导测试：
 * ① 步骤构建——七步序列 web/桌面统一（2026-10-11 对齐批；历史 GAP-T-20 桌面
 *    插步回归与 2026-10-03 前的「web 5 步 / 桌面 7 步」分叉均随统一裁决消亡，
 *    步骤序列不再随模式漂移，web 降级在步骤组件内部诚实分叉）。
 * ② 完成/建项回归（2026-09-12 实机暴露）——向导 API 层曾指向服务端从未实现
 *    的 /onboarding/* 五端点（恒 404）：「进入 Ordo」静默失败无法进入；建项
 *    提交永远不前进。修复后 finish 纯前端/壳侧完成（零网络依赖）、建项落
 *    真实 POST /projects 契约端点。
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';

const postMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());
const setOnboardingCompletedMock = vi.hoisted(() => vi.fn());
const setOnboardingOpenMock = vi.hoisted(() => vi.fn());
const persistOnboardingMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/types/electron-api', () => ({
  isDesktopShellAvailable: () => false,
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
  useAppStore: () => ({
    setOnboardingCompleted: setOnboardingCompletedMock,
    setOnboardingOpen: setOnboardingOpenMock,
  }),
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
  setOnboardingOpenMock.mockClear();
  persistOnboardingMock.mockClear();
});

describe('buildSteps（初始化向导步骤序列）', () => {
  it('七步统一（web/桌面同序）：欢迎 → 工作目录 → 环境检查 → 建项 → 连仓库 → 配 AI → 完成', () => {
    const steps = buildSteps();
    expect(steps.map((s) => s.id)).toEqual([
      'welcome',
      'workspace-root',
      'environment',
      'create-project',
      'connect-repository',
      'add-ai',
      'complete',
    ]);
    expect(steps[0].status).toBe('current');
    expect(steps[1].status).toBe('pending');
    expect(steps[2].status).toBe('pending');
  });
});

describe('finishOnboarding（进入 Ordo 回归）', () => {
  it('完成是纯前端/壳侧动作：置标记、镜像壳侧、跳 /app，零网络依赖', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper: createWrapper() });

    act(() => {
      result.current.finishOnboarding.mutate();
    });

    expect(setOnboardingCompletedMock).toHaveBeenCalledWith(true);
    // 完成须同时复位侧边栏重开开关：gate 条件是 completed && !open，
    // 不复位的话从侧边栏进入的会话点「进入 Ordo」后向导关不掉（2026-10-04 实机暴露）
    expect(setOnboardingOpenMock).toHaveBeenCalledWith(false);
    expect(persistOnboardingMock).toHaveBeenCalledWith(true);
    expect(navigateMock).toHaveBeenCalledWith('/app');
    // 修复前：调 POST /onboarding/finish（服务端从未实现，404 静默）→ 按钮无反应
    expect(postMock).not.toHaveBeenCalled();
  });
});

describe('watchReplayThenStart（S6：向导完成 → 先看回放）', () => {
  it('★ 先落完成标记、再跳回放页：不落标记会在回放页上重弹向导', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper: createWrapper() });

    act(() => {
      result.current.watchReplayThenStart();
    });

    expect(setOnboardingCompletedMock).toHaveBeenCalledWith(true);
    expect(setOnboardingOpenMock).toHaveBeenCalledWith(false);
    expect(persistOnboardingMock).toHaveBeenCalledWith(true);
    expect(navigateMock).toHaveBeenCalledWith('/app/ai-surface/replay');
    // 同样零网络：完成标记是前端/壳侧状态，回放页更是一个请求都不发
    expect(postMock).not.toHaveBeenCalled();
  });

  it('★ 与「直接进入 Ordo」是两条不同的去向（次序不可颠倒的那一半）', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper: createWrapper() });

    act(() => {
      result.current.watchReplayThenStart();
    });
    expect(navigateMock).toHaveBeenCalledWith('/app/ai-surface/replay');

    navigateMock.mockClear();
    act(() => {
      result.current.finishOnboarding.mutate();
    });
    expect(navigateMock).toHaveBeenCalledWith('/app');
  });
});

describe('finishToCreateAgent（CAP-A-18 AI 员工引导闭环：跳过配置 AI 者的完成步出口）', () => {
  it('★ 先落完成标记关向导，再直达成员页 AI 员工创建深链（?create=ai 由 members-page 消费弹对话框）', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper: createWrapper() });

    act(() => {
      result.current.finishToCreateAgent();
    });

    expect(setOnboardingCompletedMock).toHaveBeenCalledWith(true);
    expect(setOnboardingOpenMock).toHaveBeenCalledWith(false);
    expect(persistOnboardingMock).toHaveBeenCalledWith(true);
    expect(navigateMock).toHaveBeenCalledWith('/app/members?create=ai');
    expect(postMock).not.toHaveBeenCalled();
  });

  it('与「直接进入 Ordo」是两条不同去向：不是落回 /app 的工作台', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper: createWrapper() });

    act(() => {
      result.current.finishToCreateAgent();
    });
    expect(navigateMock).toHaveBeenCalledWith('/app/members?create=ai');
    expect(navigateMock).not.toHaveBeenCalledWith('/app');
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
