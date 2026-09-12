import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProcessMonitorCard } from './process-monitor-card';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const { invokeMock, tauriAvailable } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  tauriAvailable: { value: true },
}));

vi.mock('@/shared/types/electron-api', () => ({
  isTauriAvailable: () => tauriAvailable.value,
  invoke: invokeMock,
}));

// 停止的守护进程行：pid=0（壳侧句柄已清空）与 running=false 同现
const STATS = [
  { role: 'shell', pid: 100, running: true, memoryMB: 120 },
  { role: 'backend', pid: 4300, running: true, port: 4300, memoryMB: 256, transport: 'utility' },
  { role: 'daemon', pid: 0, running: false },
];

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockResolvedValue({ processes: STATS });
  tauriAvailable.value = true;
});

describe('ProcessMonitorCard', () => {
  it('桌面模式渲染托管进程行并映射端口/内存字段', async () => {
    render(<ProcessMonitorCard />);
    expect(await screen.findByText('settings.desktopProcessRoleBackend')).toBeInTheDocument();
    expect(screen.getByText('settings.desktopProcessRoleShell')).toBeInTheDocument();
    expect(screen.getByText('settings.desktopProcessRoleDaemon')).toBeInTheDocument();
    // backend 行：pid 与监听端口都是 4300
    expect(screen.getAllByText('4300')).toHaveLength(2);
    expect(screen.getByText('256 MB')).toBeInTheDocument();
    expect(screen.getByText('120 MB')).toBeInTheDocument();
  });

  it('已停止进程行显示离线且缺省字段渲染为 —', async () => {
    render(<ProcessMonitorCard />);
    await screen.findByText('settings.desktopProcessRoleDaemon');
    expect(screen.getByText('settings.runtimeOffline')).toBeInTheDocument();
    // daemon 行 pid/port/内存 + shell 行 port 共四处缺省
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });

  it('采集命令失败时错误可见且行仍在（诚实降级）', async () => {
    invokeMock.mockRejectedValue(new Error('tasklist 失败'));
    render(<ProcessMonitorCard />);
    expect(await screen.findByText('tasklist 失败')).toBeInTheDocument();
  });

  it('web 模式不渲染', () => {
    tauriAvailable.value = false;
    const { container } = render(<ProcessMonitorCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it('手动刷新重新拉取进程数据', async () => {
    render(<ProcessMonitorCard />);
    await screen.findByText('settings.desktopProcessRoleShell');
    fireEvent.click(screen.getByRole('button', { name: 'settings.desktopProcessRefresh' }));
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(2));
    expect(invokeMock).toHaveBeenLastCalledWith('get_process_stats');
  });
});
