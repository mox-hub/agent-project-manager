import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DesktopLogCard } from './desktop-log-card';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const { invokeMock, tauriAvailable, toastMock, writeTextMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  tauriAvailable: { value: true },
  toastMock: Object.assign(vi.fn(), { error: vi.fn() }),
  writeTextMock: vi.fn(),
}));

vi.mock('@/shared/types/electron-api', () => ({
  isTauriAvailable: () => tauriAvailable.value,
  invoke: invokeMock,
}));

vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

const SNAPSHOT = {
  lines: [
    {
      timestamp: '2026-09-12T10:00:00.000Z',
      level: 'INFO',
      message: '[daemon:stdout] heartbeat ok',
    },
    { timestamp: '2026-09-12T10:00:01.000Z', level: 'ERROR', message: 'backend crashed' },
    { timestamp: '', level: 'RAW', message: 'raw child output' },
  ],
  counts: { INFO: 1, WARN: 0, ERROR: 1, RAW: 1 },
  truncated: false,
  filePath: 'C:/logs/desktop-main.log',
};

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockImplementation(async (cmd: string) => {
    if (cmd === 'get_desktop_logs') {
      return SNAPSHOT;
    }
    return { ok: true };
  });
  tauriAvailable.value = true;
  writeTextMock.mockReset();
  writeTextMock.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: writeTextMock },
    configurable: true,
  });
});

describe('DesktopLogCard', () => {
  it('渲染日志行与级别计数 chips', async () => {
    render(<DesktopLogCard />);
    expect(await screen.findByText(/heartbeat ok/)).toBeInTheDocument();
    expect(screen.getByText('backend crashed')).toBeInTheDocument();
    expect(screen.getByText('raw child output')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ALL 3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'INFO 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'WARN 0' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ERROR 1' })).toBeInTheDocument();
  });

  it('级别筛选只留对应行', async () => {
    render(<DesktopLogCard />);
    await screen.findByText(/heartbeat ok/);
    fireEvent.click(screen.getByRole('button', { name: 'ERROR 1' }));
    expect(screen.getByText('backend crashed')).toBeInTheDocument();
    expect(screen.queryByText(/heartbeat ok/)).not.toBeInTheDocument();
    expect(screen.queryByText('raw child output')).not.toBeInTheDocument();
  });

  it('搜索按消息内容过滤', async () => {
    render(<DesktopLogCard />);
    await screen.findByText(/heartbeat ok/);
    fireEvent.change(screen.getByPlaceholderText('settings.desktopLogSearch'), {
      target: { value: 'crash' },
    });
    expect(screen.getByText('backend crashed')).toBeInTheDocument();
    expect(screen.queryByText(/heartbeat ok/)).not.toBeInTheDocument();
  });

  it('复制把筛选后的行写入剪贴板并提示成功', async () => {
    render(<DesktopLogCard />);
    await screen.findByText(/heartbeat ok/);
    fireEvent.click(screen.getByRole('button', { name: 'settings.desktopLogCopy' }));
    await waitFor(() => expect(writeTextMock).toHaveBeenCalledTimes(1));
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('[daemon:stdout] heartbeat ok'),
    );
    expect(toastMock).toHaveBeenCalledWith('settings.desktopLogCopied');
  });

  it('剪贴板不可用时提示失败', async () => {
    writeTextMock.mockRejectedValue(new Error('denied'));
    render(<DesktopLogCard />);
    await screen.findByText(/heartbeat ok/);
    fireEvent.click(screen.getByRole('button', { name: 'settings.desktopLogCopy' }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('settings.desktopLogCopyFailed'));
  });

  it('清空调壳命令并刷新重读', async () => {
    render(<DesktopLogCard />);
    await screen.findByText(/heartbeat ok/);
    fireEvent.click(screen.getByRole('button', { name: 'settings.desktopLogClear' }));
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith('clear_desktop_logs'));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith('settings.desktopLogCleared'));
    // 清空后 refresh 再读一次日志
    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith('get_desktop_logs', { tail: 500 }),
    );
  });

  it('web 模式不渲染', () => {
    tauriAvailable.value = false;
    const { container } = render(<DesktopLogCard />);
    expect(container).toBeEmptyDOMElement();
  });
});
