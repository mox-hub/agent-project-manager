import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createTestQueryClient } from '@/test-utils/providers';
import type { SurfaceSnapshot } from '../adapters/surface-snapshot';
import { NARRATION_TTL_MS, useSurfaceNarration } from './use-surface-narration';

/**
 * 叙述 hook 的四条硬约束（ARCH-AISURFACE-001 §3.3）。
 *
 * 最贵的一条是**约束②成本纪律**：快照每来一条事件就换一次引用，若把快照放进
 * queryKey（或按引用触发重取），事件洪峰下就变成逐事件调模型。本文件用
 * "换快照但不推进时间 → 调用次数不变"把这条钉死。
 *
 * 次贵的是**约束③确定性降级**：模型挂了/答非所问，都必须回落模板并置 degraded，
 * 绝不白屏，也绝不把模板冒充成 AI 判断。
 */

const silent = vi.hoisted(() => vi.fn());
vi.mock('@/modules/assistant/api/assistant-api', () => ({
  assistantApi: { silent: (...args: unknown[]) => silent(...args) },
}));

const snapshot = (over: Partial<SurfaceSnapshot> = {}): SurfaceSnapshot => ({
  colleagues: {
    total: 2,
    needYou: 1,
    working: 1,
    suggestions: 0,
    idle: 0,
    other: 0,
    blocked: 0,
  },
  roster: [
    {
      name: '小码',
      status: 'working',
      task: '办公室聚合端点',
      runStatus: 'in_progress',
      runStatusSource: 'snapshot',
      runStartedAt: '2026-09-15T06:20:00.000Z',
      lastProgress: null,
      lastProgressAt: null,
      lastStep: null,
      lastStepSequence: null,
      blocking: 0,
    },
  ],
  lanes: [],
  needsYou: {
    total: 1,
    blocking: 1,
    advisory: 0,
    hiddenCount: 0,
    top: [
      {
        id: 'release:rel-1',
        title: '合并登录页分支',
        urgency: 'blocking',
        waitingSince: '2026-09-15T05:00:00.000Z',
      },
    ],
  },
  gaps: [],
  ...over,
});

/** 无事实的空白快照：没有同事、没有待办、没有计数 */
const emptySnapshot = (): SurfaceSnapshot =>
  snapshot({
    colleagues: {
      total: 0,
      needYou: 0,
      working: 0,
      suggestions: 0,
      idle: 0,
      other: 0,
      blocked: 0,
    },
    roster: [],
    needsYou: { total: 0, blocking: 0, advisory: 0, hiddenCount: 0, top: [] },
  });

/** 可控时钟：TTL 边界不靠真实等待（否则测试要么慢要么飘） */
let now = Date.UTC(2026, 8, 15, 7, 0, 0);

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
);

function renderNarration(initial: SurfaceSnapshot) {
  return renderHook(
    ({ value }: { value: SurfaceSnapshot }) => useSurfaceNarration(value),
    { initialProps: { value: initial }, wrapper },
  );
}

beforeEach(() => {
  now = Date.UTC(2026, 8, 15, 7, 0, 0);
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  silent.mockReset();
  silent.mockResolvedValue({
    scenario: 'surface-narration',
    data: { headline: '一切正常' },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useSurfaceNarration', () => {
  it('有事实可讲 → 调一次 silent，产出 AI 叙述与开销回执', async () => {
    silent.mockResolvedValue({
      scenario: 'surface-narration',
      data: {
        headline: '2 个人在干活，1 件事卡着你',
        needsYou: [
          { decisionId: 'release:rel-1', oneLineWhy: '发版门禁没过' },
          // 模型编的 id：解析层必须挡掉（否则点开的是另一张卡）
          { decisionId: 'acceptance:编造的', oneLineWhy: '编的' },
        ],
      },
      usage: {
        promptTokens: 900,
        completionTokens: 300,
        totalTokens: 1200,
        costUsd: null,
        durationMs: 1500,
      },
    });

    const { result } = renderNarration(snapshot());

    await waitFor(() => expect(result.current.state).toBe('ready'));

    expect(silent).toHaveBeenCalledTimes(1);
    expect(silent.mock.calls[0][0]).toBe('surface-narration');
    expect(result.current.narration?.source).toBe('ai');
    // 估价口径不可用如实透出 null——不折算成 0
    expect(result.current.usage?.costUsd).toBeNull();
    expect(result.current.narration?.needsYou.map((item) => item.decisionId)).toEqual([
      'release:rel-1',
    ]);
    expect(result.current.degradedNote).toBeUndefined();
  });

  it('没有一件可讲的事 → 一次模型都不调（省 token，也不编话）', async () => {
    const { result } = renderNarration(emptySnapshot());

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(silent).not.toHaveBeenCalled();
    expect(result.current.state).toBe('idle');
    expect(result.current.narration).toBeNull();
  });

  it('★ 成本纪律：快照变了但 TTL 未过 → 不重复调用（防逐事件调模型）', async () => {
    const { rerender, result } = renderNarration(snapshot());
    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(silent).toHaveBeenCalledTimes(1);

    // 投影层每来一条事件就换一次引用：事实签名变了，时钟没走
    now += 1_000;
    rerender({ value: snapshot({ gaps: ['多了一条缺口'] }) });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(silent).toHaveBeenCalledTimes(1);

    // 越过 TTL 后同样的变化才允许再花一次
    now += NARRATION_TTL_MS;
    rerender({ value: snapshot({ gaps: ['又多了一条缺口'] }) });

    await waitFor(() => expect(silent).toHaveBeenCalledTimes(2));
  });

  it('★ 降级：模型答非所问（不成形）→ 匹配模板 + 标注规则生成', async () => {
    silent.mockResolvedValue({
      scenario: 'surface-narration',
      data: { highlights: ['只有动态没有总述'] },
    });

    const { result } = renderNarration(snapshot());

    await waitFor(() => expect(result.current.state).toBe('degraded'));

    expect(result.current.narration?.source).toBe('template');
    expect(result.current.narration?.headline).toContain('2 位 AI 同事');
    expect(result.current.degradedNote).toContain('以下为规则生成的摘要');
  });

  it('★ 降级：模型调用失败 → 盯盘不白屏，仍给规则摘要', async () => {
    silent.mockRejectedValue(new Error('provider 无可用模型'));

    const { result } = renderNarration(snapshot());

    await waitFor(() => expect(result.current.state).toBe('degraded'));

    expect(result.current.narration?.source).toBe('template');
    expect(result.current.degradedNote).toContain('没有可用的 AI 模型');
  });

  it('provider 未上报 token → usage 整个字段缺席，不补 0', async () => {
    const { result } = renderNarration(snapshot());

    await waitFor(() => expect(result.current.state).toBe('ready'));

    expect(result.current.usage).toBeUndefined();
  });

  it('刷新是用户显式意图，可以绕过 TTL', async () => {
    const { result } = renderNarration(snapshot());
    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(silent).toHaveBeenCalledTimes(1);

    result.current.refresh();

    await waitFor(() => expect(silent).toHaveBeenCalledTimes(2));
  });
});
