/**
 * 桌面会话桥测试：壳侧镜像恢复进 localStorage / 关键变更镜像回壳。
 * 背景：生产模式动态端口漂移换 origin 后 localStorage 隔离，壳侧 desktop-state.json
 * 是登录缓存（CAP-A-14 体验切片）的唯一跨 origin 载体。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeMock = vi.hoisted(() => vi.fn());
const isTauriAvailableMock = vi.hoisted(() => vi.fn(() => true));

vi.mock('@/shared/types/electron-api', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
  isTauriAvailable: () => isTauriAvailableMock(),
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

describe('restoreDesktopSession', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    isTauriAvailableMock.mockReturnValue(true);
  });

  it('壳侧有 token 时恢复进 localStorage（origin 漂移后免重登）', async () => {
    const store = installMemoryStorage();
    invokeMock.mockResolvedValue({
      access_token: 'jwt-abc',
      'apm-workspace-id': 'ws-1',
    });

    await restoreDesktopSession();

    expect(store.get('access_token')).toBe('jwt-abc');
    expect(store.get('apm-workspace-id')).toBe('ws-1');
  });

  it('壳侧无 token 时不覆盖 localStorage 现值', async () => {
    const store = installMemoryStorage();
    store.set('access_token', 'existing');
    invokeMock.mockResolvedValue({});

    await restoreDesktopSession();

    expect(store.get('access_token')).toBe('existing');
  });

  it('壳侧 onboarding_completed=true 时 merge 进 zustand persist JSON', async () => {
    const store = installMemoryStorage();
    store.set(
      'app-storage',
      JSON.stringify({ state: { onboardingCompleted: false, viewMode: 'list' }, version: 0 }),
    );
    invokeMock.mockResolvedValue({ onboarding_completed: true });

    await restoreDesktopSession();

    const parsed = JSON.parse(store.get('app-storage')!) as {
      state: { onboardingCompleted: boolean; viewMode: string };
    };
    expect(parsed.state.onboardingCompleted).toBe(true);
    expect(parsed.state.viewMode).toBe('list');
  });

  it('web 模式（壳桥不可用）为 no-op', async () => {
    const store = installMemoryStorage();
    isTauriAvailableMock.mockReturnValue(false);

    await restoreDesktopSession();

    expect(invokeMock).not.toHaveBeenCalled();
    expect(store.has('access_token')).toBe(false);
  });
});

describe('persistTokenToShell', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    isTauriAvailableMock.mockReturnValue(true);
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
    isTauriAvailableMock.mockReturnValue(false);

    persistTokenToShell('jwt-x');

    expect(invokeMock).not.toHaveBeenCalled();
  });
});
