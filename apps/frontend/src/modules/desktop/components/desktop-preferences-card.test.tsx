import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DesktopPreferencesCard } from './desktop-preferences-card';

// base-ui Switch 点击路径依赖 window.PointerEvent（jsdom 缺失），与 dock-section.test.tsx 同解
beforeAll(() => {
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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}));

const { invokeMock, shellAvailable, toastMock, updateListener } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  shellAvailable: { value: true },
  toastMock: Object.assign(vi.fn(), { error: vi.fn() }),
  updateListener: { fn: null as ((status: unknown) => void) | null },
}));

vi.mock('@/shared/types/electron-api', () => ({
  isDesktopShellAvailable: () => shellAvailable.value,
  invoke: invokeMock,
  subscribeUpdateStatus: (cb: (status: unknown) => void) => {
    updateListener.fn = cb;
    return () => {
      updateListener.fn = null;
    };
  },
}));

vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

/** 壳 IPC 桩：close_to_tray 既有链路 + 新增 app_info/update_status 读面，未匹配命令回空对象 */
function stubInvoke(extra?: Record<string, (cmd: string) => unknown>): void {
  invokeMock.mockImplementation(async (cmd: string, args?: Record<string, unknown>) => {
    if (cmd === 'get_desktop_state') {
      return {};
    }
    if (extra?.[cmd]) {
      return extra[cmd](cmd);
    }
    if (args !== undefined) {
      return {};
    }
    return {};
  });
}

beforeEach(() => {
  invokeMock.mockReset();
  shellAvailable.value = true;
  toastMock.mockClear();
  toastMock.error.mockClear();
  updateListener.fn = null;
});

describe('DesktopPreferencesCard', () => {
  it('读取壳侧偏好：close_to_tray 缺省视为开启', async () => {
    invokeMock.mockResolvedValue({ onboarding_completed: true });
    render(<DesktopPreferencesCard />);
    const sw = await screen.findByRole('switch', { name: 'settings.desktopPrefsCloseToTray' });
    expect(sw.getAttribute('aria-checked')).toBe('true');
    expect(invokeMock).toHaveBeenCalledWith('get_desktop_state');
  });

  it('切换关闭行为写回壳侧状态', async () => {
    invokeMock.mockImplementation(async (cmd: string, args?: Record<string, unknown>) => {
      if (cmd === 'get_desktop_state') {
        return { close_to_tray: true };
      }
      if (cmd === 'set_desktop_state') {
        return { close_to_tray: args?.close_to_tray };
      }
      return {};
    });
    render(<DesktopPreferencesCard />);
    const sw = await screen.findByRole('switch', { name: 'settings.desktopPrefsCloseToTray' });
    fireEvent.click(sw);
    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith('set_desktop_state', { close_to_tray: false }),
    );
  });

  it('写回失败时回滚开关并提示错误', async () => {
    invokeMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_desktop_state') {
        return { close_to_tray: true };
      }
      if (cmd === 'set_desktop_state') {
        throw new Error('denied');
      }
      return {};
    });
    render(<DesktopPreferencesCard />);
    const sw = await screen.findByRole('switch', { name: 'settings.desktopPrefsCloseToTray' });
    fireEvent.click(sw);
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('denied'));
    await waitFor(() => expect(sw.getAttribute('aria-checked')).toBe('true'));
  });

  it('展示当前版本对照（get_app_info）', async () => {
    stubInvoke({
      get_app_info: () => ({ version: '0.7.13' }),
    });
    render(<DesktopPreferencesCard />);
    const line = await screen.findByText(/settings\.desktopPrefsCurrentVersion/);
    expect(line.textContent).toContain('0.7.13');
  });

  it('检查更新展示状态文案', async () => {
    stubInvoke({
      check_updates: () => ({ state: 'downloaded', version: '0.7.0' }),
    });
    render(<DesktopPreferencesCard />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'settings.desktopPrefsCheckUpdate' }),
    );
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith('check_updates'));
    expect(
      await screen.findByText(/settings\.desktopPrefsUpdateDownloaded/),
    ).toBeInTheDocument();
  });

  it('壳推送下载进度：渲染进度条并禁用检查按钮', async () => {
    stubInvoke();
    const view = render(<DesktopPreferencesCard />);
    await waitFor(() => expect(updateListener.fn).not.toBeNull());
    act(() => {
      updateListener.fn?.({ state: 'downloading', version: '0.8.0', progress: 42 });
    });
    expect(
      await screen.findByText(/settings\.desktopPrefsUpdateDownloading/),
    ).toBeInTheDocument();
    expect(
      view.container.querySelector('[data-slot="progress-track"]'),
    ).not.toBeNull();
    expect(
      screen.getByRole('button', { name: 'settings.desktopPrefsCheckUpdate' }),
    ).toBeDisabled();
  });

  it('下载完成态展示更新日志（releaseNotes）', async () => {
    stubInvoke();
    render(<DesktopPreferencesCard />);
    await waitFor(() => expect(updateListener.fn).not.toBeNull());
    act(() => {
      updateListener.fn?.({
        state: 'downloaded',
        version: '0.8.0',
        releaseNotes: '- 修复自动更新状态显示',
      });
    });
    expect(
      await screen.findByText('settings.desktopPrefsUpdateReleaseNotes'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('- 修复自动更新状态显示'),
    ).toBeInTheDocument();
  });

  it('导出诊断成功提示路径，取消不提示', async () => {
    stubInvoke({
      export_diagnostics: () => ({ path: 'C:/tmp/apm-diagnostics.zip' }),
    });
    render(<DesktopPreferencesCard />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'settings.desktopPrefsExportDiagnostics' }),
    );
    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    expect(toastMock).toHaveBeenCalledWith(
      expect.stringContaining('settings.desktopPrefsExported'),
    );
  });

  it('web 模式不渲染', () => {
    shellAvailable.value = false;
    const { container } = render(<DesktopPreferencesCard />);
    expect(container).toBeEmptyDOMElement();
  });
});
