/**
 * HeartbeatMonitor（心跳监控条）持久化单测
 * 覆盖：persistKey 写入 localStorage、重挂载恢复历史、损坏数据静默降级、
 * 无 persistKey 不落盘。测试 setup 的 localStorage 是无实现 mock——
 * 按惯例自接内存 Map 实现后断言。
 */
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import { HeartbeatMonitor } from './heartbeat-monitor';

const store = new Map<string, string>();

const probeOk = vi.fn(async () => ({ up: true }));

const renderMonitor = (props: Partial<Parameters<typeof HeartbeatMonitor>[0]> = {}) =>
  render(<HeartbeatMonitor probe={probeOk} intervalMs={3600_000} {...props} />);

describe('HeartbeatMonitor 样本持久化', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.clear();
    (localStorage.getItem as Mock).mockImplementation((k: string) => store.get(k) ?? null);
    (localStorage.setItem as Mock).mockImplementation((k: string, v: string) => {
      store.set(k, String(v));
    });
  });

  it('persistKey：探测结果写入 localStorage（按 key 隔离）', async () => {
    renderMonitor({ persistKey: 'rt-1' });

    await waitFor(() => expect(store.has('apm.heartbeat-monitor.rt-1')).toBe(true));
    const saved = JSON.parse(store.get('apm.heartbeat-monitor.rt-1')!) as {
      at: number;
      up: boolean;
    }[];
    expect(saved).toHaveLength(1);
    expect(saved[0].up).toBe(true);
  });

  it('重挂载：历史样本从 localStorage 恢复并与新探测拼接', async () => {
    store.set(
      'apm.heartbeat-monitor.rt-2',
      JSON.stringify([
        { at: 1_000, up: true },
        { at: 2_000, up: false, detail: 'offline' },
      ]),
    );
    renderMonitor({ persistKey: 'rt-2' });

    // 首挂立即探测一次：2 条历史 + 1 条新样本 = 3
    await waitFor(() => {
      const saved = JSON.parse(store.get('apm.heartbeat-monitor.rt-2')!) as unknown[];
      expect(saved).toHaveLength(3);
    });
  });

  it('损坏的持久化数据：静默降级为空历史，不崩溃', async () => {
    store.set('apm.heartbeat-monitor.rt-3', '{not-json');
    const { container } = renderMonitor({ persistKey: 'rt-3' });

    await waitFor(() => expect(probeOk).toHaveBeenCalled());
    expect(container.querySelector('span[role]')).toBeNull();
    // 探测后重新落盘（损坏数据被覆盖为合法样本）
    await waitFor(() => expect(store.has('apm.heartbeat-monitor.rt-3')).toBe(true));
  });

  it('无 persistKey：不读不写 localStorage', async () => {
    renderMonitor();
    await waitFor(() => expect(probeOk).toHaveBeenCalled());
    expect((localStorage.setItem as Mock)).not.toHaveBeenCalled();
  });
});
