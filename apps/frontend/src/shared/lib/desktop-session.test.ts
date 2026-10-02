/**
 * 桌面会话桥测试：壳侧后端地址钉底 / 壳侧镜像恢复进 localStorage / 关键变更镜像回壳。
 * 背景：生产模式动态端口漂移换 origin 后 localStorage 隔离，壳侧 desktop-state.json
 * 是登录缓存（CAP-A-14 体验切片）的唯一跨 origin 载体；且 API base 必须钉底到壳侧
 * 真实后端，否则回落 `/_api`（Vite 代理默认端口 4300）会被僵尸后端判 401 踢回登录页。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const invokeMock = vi.hoisted(() => vi.fn());
const isDesktopShellAvailableMock = vi.hoisted(() => vi.fn(() => true));
const baseUrlState = vi.hoisted(() => ({ value: null as string | null }));

vi.mock('@/shared/types/electron-api', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
  isDesktopShellAvailable: () => isDesktopShellAvailableMock(),
  setApiBaseUrl: (url: string) => {
    baseUrlState.value = url;
  },
  getApiBaseUrl: () => baseUrlState.value,
}));

import {
  persistTokenToShell,
  restoreDesktopSession,
} from './desktop-session';

/** 测试环境 localStorage 是无实现 vi.fn() mock——自接内存实现才能断言持久化 */
function installMemoryStorage(): Map<string, string> {
  const store = new Map<string, string>();
  const impl = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  vi.stubGlobal('localStorage', impl);
  return store;
}

/** 按命令名分派的壳桥 mock：get_app_info（钉底）与 get_desktop_state（镜像）各自应答 */
function mockShell(handlers: {
  appInfo?: () => unknown;
  desktopState?: () => unknown;
}): void {
  invokeMock.mockImplementation((cmd: string) => {
    if (cmd === 'get_app_info') {
      return Promise.resolve(handlers.appInfo ? handlers.appInfo() : {});
    }
    if (cmd === 'get_desktop_state') {
      return Promise.resolve(handlers.desktopState ? handlers.desktopState() : {});
    }
    return Promise.resolve({});
  });
}

describe('restoreDesktopSession', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    isDesktopShellAvailableMock.mockReturnValue(true);
    baseUrlState.value = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('钉底壳侧后端地址并报告 ready', async () => {
    installMemoryStorage();
    mockShell({
      appInfo: () => ({ apiBaseUrl: 'http://127.0.0.1:4302' }),
      desktopState: () => ({}),
    });

    const result = await restoreDesktopSession();

    expect(result.ready).toBe(true);
    expect(baseUrlState.value).toBe('http://127.0.0.1:4302');
  });

  it('壳侧有 token 时恢复进 localStorage（origin 漂移后免重登）', async () => {
    const store = installMemoryStorage();
    mockShell({
      appInfo: () => ({ apiBaseUrl: 'http://127.0.0.1:4302' }),
      desktopState: () => ({ access_token: 'jwt-abc', 'apm-workspace-id': 'ws-1' }),
    });

    await restoreDesktopSession();

    expect(store.get('access_token')).toBe('jwt-abc');
    expect(store.get('apm-workspace-id')).toBe('ws-1');
  });

  it('壳侧无 token 时不覆盖 localStorage 现值，并回写镜像以防后续窗口丢失登录态', async () => {
    const store = installMemoryStorage();
    store.set('access_token', 'existing');
    mockShell({
      appInfo: () => ({ apiBaseUrl: 'http://127.0.0.1:4302' }),
      desktopState: () => ({}),
    });

    await restoreDesktopSession();

    expect(store.get('access_token')).toBe('existing');
    expect(invokeMock).toHaveBeenCalledWith('set_desktop_state', {
      access_token: 'existing',
    });
  });

  it('后端重启窗口内 apiBaseUrl 暂空时退避重试直至拿到地址', async () => {
    vi.useFakeTimers();
    installMemoryStorage();
    let calls = 0;
    mockShell({
      appInfo: () => {
        calls += 1;
        return calls < 3 ? { apiBaseUrl: '' } : { apiBaseUrl: 'http://127.0.0.1:4305' };
      },
      desktopState: () => ({}),
    });

    const pending = restoreDesktopSession();
    await vi.advanceTimersByTimeAsync(1000);
    const result = await pending;

    expect(result.ready).toBe(true);
    expect(baseUrlState.value).toBe('http://127.0.0.1:4305');
    expect(calls).toBe(3);
  });

  it('重试预算耗尽仍无地址时报告 not ready（调用方不得照常渲染）', async () => {
    vi.useFakeTimers();
    installMemoryStorage();
    mockShell({ appInfo: () => ({ apiBaseUrl: '' }), desktopState: () => ({}) });

    const pending = restoreDesktopSession();
    await vi.advanceTimersByTimeAsync(10000);
    const result = await pending;

    expect(result.ready).toBe(false);
    expect(baseUrlState.value).toBeNull();
  });

  it('壳侧 onboarding_completed=true 时 merge 进 zustand persist JSON', async () => {
    const store = installMemoryStorage();
    store.set(
      'app-storage',
      JSON.stringify({ state: { onboardingCompleted: false, viewMode: 'list' }, version: 0 }),
    );
    mockShell({
      appInfo: () => ({ apiBaseUrl: 'http://127.0.0.1:4302' }),
      desktopState: () => ({ onboarding_completed: true }),
    });

    await restoreDesktopSession();

    const parsed = JSON.parse(store.get('app-storage')!) as {
      state: { onboardingCompleted: boolean; viewMode: string };
    };
    expect(parsed.state.onboardingCompleted).toBe(true);
    expect(parsed.state.viewMode).toBe('list');
  });

  it('web 模式（壳桥不可用）为 no-op 且恒 ready', async () => {
    const store = installMemoryStorage();
    isDesktopShellAvailableMock.mockReturnValue(false);

    const result = await restoreDesktopSession();

    expect(result.ready).toBe(true);
    expect(invokeMock).not.toHaveBeenCalled();
    expect(store.has('access_token')).toBe(false);
  });
});

describe('persistTokenToShell', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    isDesktopShellAvailableMock.mockReturnValue(true);
  });

  it('登录成功镜像 token 到壳侧', () => {
    installMemoryStorage();
    persistTokenToShell('jwt-new');

    expect(invokeMock).toHaveBeenCalledWith('set_desktop_state', {
      access_token: 'jwt-new',
    });
  });

  it('登出/401 清除镜像', () => {
    installMemoryStorage();
    persistTokenToShell(null);

    expect(invokeMock).toHaveBeenCalledWith('set_desktop_state', {
      access_token: undefined,
    });
  });

  it('web 模式不调用壳桥', () => {
    installMemoryStorage();
    isDesktopShellAvailableMock.mockReturnValue(false);

    persistTokenToShell('jwt-x');

    expect(invokeMock).not.toHaveBeenCalled();
  });
});
