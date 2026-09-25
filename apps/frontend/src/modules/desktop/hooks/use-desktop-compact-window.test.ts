import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDesktopCompactWindow } from './use-desktop-compact-window';

const { invokeMock, shellAvailable } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  shellAvailable: { value: true },
}));

vi.mock('@/shared/types/electron-api', () => ({
  isDesktopShellAvailable: () => shellAvailable.value,
  invoke: invokeMock,
}));

describe('useDesktopCompactWindow', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({ ok: true });
    shellAvailable.value = true;
  });

  it('桌面壳下挂载即进入紧凑模式、卸载即恢复完整窗口', () => {
    const { unmount } = renderHook(() => useDesktopCompactWindow());
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith('set_compact_mode', { enabled: true });
    unmount();
    expect(invokeMock).toHaveBeenCalledTimes(2);
    expect(invokeMock).toHaveBeenLastCalledWith('set_compact_mode', { enabled: false });
  });

  it('web 端（无壳桥）不触发任何 invoke', () => {
    shellAvailable.value = false;
    const { unmount } = renderHook(() => useDesktopCompactWindow());
    unmount();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('旧壳未知命令（invoke 拒绝）静默降级不抛错', async () => {
    invokeMock.mockRejectedValue(new Error('未知命令: set_compact_mode'));
    const { unmount } = renderHook(() => useDesktopCompactWindow());
    unmount();
    // 两个被吞掉的 promise 链 settle——若未捕获拒绝，vitest 会以 unhandled rejection 判失败
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(invokeMock).toHaveBeenCalledTimes(2);
  });
});
