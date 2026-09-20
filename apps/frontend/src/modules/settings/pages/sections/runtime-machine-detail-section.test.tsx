/**
 * 运行时机器详情页（守护进程启动/重启按钮）单测
 * 覆盖：非壳环境无按钮（诚实降级）、壳内按 daemon 进程状态切换「启动/重启」文案与
 * 调用序列（重启 = stop → start）、成功后刷新注册列表、opencode 运行时行出现。
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test-utils/providers';
import { RuntimeMachineDetailSection } from './runtime-machine-detail-section';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: unknown) =>
      typeof opts === 'string' ? opts : key,
    i18n: { language: 'zh-CN' },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// @lobehub/icons 的 re-export 链牵出 emoji-mart 原生 ESM（vitest 不 tree-shake），
// 经 provider-meta 消费——stub 掉品牌元数据即隔离
vi.mock('@/shared/ai-providers/provider-meta', () => ({
  getProviderMeta: (pid: string) => ({
    label: pid,
    Icon: () => <svg data-testid={`brand-${pid}`} />,
  }),
}));

// 心跳监控条为外探注入的展示件，mock 掉避免内部查询噪音
vi.mock('@/shared/runtime/heartbeat-monitor', () => ({
  HeartbeatMonitor: () => <div data-testid="heartbeat-monitor" />,
}));

// 数据 hook mock；api 函数可控；machineDisplayName / formatRelativeTime 走真实实现
const registrationsFixture = [
  {
    runtimeId: 'rt-1',
    deviceId: 'device-mox',
    hostPlatform: 'win32',
    runtimeVersion: '0.1.0',
    protocolVersion: '1.0.0',
    workspaceRoots: [],
    availableProviders: ['file', 'git', 'terminal'],
    cliProviders: ['claude-code', 'codex', 'zcode', 'opencode'],
    status: 'online' as const,
    lastHeartbeatAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  },
];
const serverDaemon = vi.hoisted(() => ({
  // 'ok'=standalone 可用 / 'forbidden'=远程部署 403 降级
  mode: 'ok' as 'ok' | 'forbidden',
  running: false,
}));
vi.mock('@/shared/runtime/runtime-api', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/shared/runtime/runtime-api')>();
  return {
    ...actual,
    useRuntimeRegistrations: vi.fn(() => ({
      data: registrationsFixture,
      isLoading: false,
    })),
    getLocalDaemonStatus: vi.fn(async () => {
      if (serverDaemon.mode === 'forbidden') throw new Error('403');
      return { running: serverDaemon.running, pid: null, startedAt: null, logPath: '' };
    }),
    startLocalDaemon: vi.fn(async () => {
      serverDaemon.running = true;
      return { running: true, pid: 4321, startedAt: null, logPath: '' };
    }),
    stopLocalDaemon: vi.fn(async () => {
      serverDaemon.running = false;
      return { ok: true as const };
    }),
  };
});

const shellState = vi.hoisted(() => ({
  available: false,
  status: { running: false },
}));
vi.mock('@/shared/types/electron-api', () => ({
  isDesktopShellAvailable: vi.fn(() => shellState.available),
  invoke: vi.fn(async (cmd: string) => {
    if (cmd === 'get_runtime_daemon_status') return shellState.status;
    if (cmd === 'start_runtime_daemon') {
      shellState.status = { running: true };
      return { pid: 4321 };
    }
    if (cmd === 'stop_runtime_daemon') {
      shellState.status = { running: false };
      return { ok: true };
    }
    return {};
  }),
  getApiBaseUrl: vi.fn(() => null),
  setApiBaseUrl: vi.fn(),
}));

import { toast } from '@/components/ui/toast';
import { invoke } from '@/shared/types/electron-api';
import {
  getLocalDaemonStatus,
  startLocalDaemon,
  stopLocalDaemon,
} from '@/shared/runtime/runtime-api';

const renderPage = () =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/app/settings/runtime/rt-1']}>
        <Routes>
          <Route
            path="/app/settings/runtime/:runtimeId"
            element={<RuntimeMachineDetailSection />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  shellState.available = false;
  shellState.status = { running: false };
  serverDaemon.mode = 'ok';
  serverDaemon.running = false;
});

describe('运行时机器详情页（守护进程启停按钮）', () => {
  it('浏览器 + server standalone：按钮走 server 端点，opencode 运行时行出现', async () => {
    serverDaemon.running = false;
    renderPage();

    const button = await screen.findByRole('button', {
      name: 'settings.runtimeDaemonStart',
    });
    expect(screen.getByText('opencode')).toBeInTheDocument();
    fireEvent.click(button);

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(startLocalDaemon).toHaveBeenCalledTimes(1);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('浏览器 + 远程部署（server 403）：按钮诚实降级不渲染', async () => {
    serverDaemon.mode = 'forbidden';
    renderPage();

    await waitFor(() =>
      expect(getLocalDaemonStatus).toHaveBeenCalledTimes(1),
    );
    expect(
      screen.queryByRole('button', { name: 'settings.runtimeDaemonStart' }),
    ).not.toBeInTheDocument();
  });

  it('壳内 daemon 未运行：显示「启动运行时」，点击仅拉起（壳桥）', async () => {
    shellState.available = true;
    shellState.status = { running: false };
    renderPage();

    const button = await screen.findByRole('button', {
      name: 'settings.runtimeDaemonStart',
    });
    fireEvent.click(button);

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    const cmds = vi.mocked(invoke).mock.calls.map(([cmd]) => cmd);
    expect(cmds).not.toContain('stop_runtime_daemon');
    expect(cmds).toContain('start_runtime_daemon');
  });

  it('壳内 daemon 运行中：显示「重启运行时」，点击按 stop → start 序列', async () => {
    shellState.available = true;
    shellState.status = { running: true };
    renderPage();

    const button = await screen.findByRole('button', {
      name: 'settings.runtimeDaemonRestart',
    });
    fireEvent.click(button);

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    const cmds = vi.mocked(invoke).mock.calls.map(([cmd]) => cmd);
    const stopAt = cmds.indexOf('stop_runtime_daemon');
    const startAt = cmds.indexOf('start_runtime_daemon');
    expect(stopAt).toBeGreaterThanOrEqual(0);
    expect(startAt).toBeGreaterThan(stopAt);
  });

  it('浏览器 + server standalone：daemon 运行中点击重启走 server stop → start', async () => {
    serverDaemon.running = true;
    renderPage();

    const button = await screen.findByRole('button', {
      name: 'settings.runtimeDaemonRestart',
    });
    fireEvent.click(button);

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(stopLocalDaemon).toHaveBeenCalledTimes(1);
    expect(startLocalDaemon).toHaveBeenCalledTimes(1);
  });
});
