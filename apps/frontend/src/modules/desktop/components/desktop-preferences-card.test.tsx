import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const { invokeMock, tauriAvailable, toastMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  tauriAvailable: { value: true },
  toastMock: Object.assign(vi.fn(), { error: vi.fn() }),
}));

vi.mock('@/shared/types/electron-api', () => ({
  isTauriAvailable: () => tauriAvailable.value,
  invoke: invokeMock,
}));

vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

beforeEach(() => {
  invokeMock.mockReset();
  tauriAvailable.value = true;
  toastMock.mockClear();
  toastMock.error.mockClear();
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

  it('检查更新展示状态文案', async () => {
    invokeMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_desktop_state') {
        return {};
      }
      if (cmd === 'check_updates') {
        return { state: 'downloaded', version: '0.7.0' };
      }
      return {};
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

  it('导出诊断成功提示路径，取消不提示', async () => {
    invokeMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_desktop_state') {
        return {};
      }
      if (cmd === 'export_diagnostics') {
        return { path: 'C:/tmp/apm-diagnostics.zip' };
      }
      return {};
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
    tauriAvailable.value = false;
    const { container } = render(<DesktopPreferencesCard />);
    expect(container).toBeEmptyDOMElement();
  });
});
