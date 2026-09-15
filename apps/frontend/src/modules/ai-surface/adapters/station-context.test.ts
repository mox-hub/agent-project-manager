import { describe, expect, it } from 'vitest';
import type { StationCard } from './office-to-station';
import {
  buildStationContext,
  composeSurfaceDispatch,
} from './station-context';

/**
 * 盯盘上下文注入的守卫（ARCH-AISURFACE-001 §3.2 代理态）。
 *
 * 这块的唯一职责是让 OmniDock 那句徽章**成真**：说"附带上下文"就真的附带。
 * 因此本文件守两件事——①如实搬运工人卡上已有的事实（不推算、不补默认值、
 * 不附任何"卡了多久"式的时长）；②**回显与派发同源**（只调一次组装函数）。
 */

const station = (over: Partial<StationCard> = {}): StationCard => ({
  memberId: 'ai-1',
  displayName: '小码',
  title: '全栈工程师',
  status: 'working',
  blocking: 1,
  advisory: 2,
  trustScore: 88,
  run: {
    id: 'run-1',
    label: '办公室聚合端点',
    status: 'in_progress',
    statusSource: 'snapshot',
    startedAt: '2026-09-15T06:20:00.000Z',
  },
  progress: {
    source: 'runtime',
    text: '正在跑 npm test',
    at: Date.parse('2026-09-15T06:41:00.000Z'),
    eventName: 'runtime.execution.event',
  },
  capacity: {
    activeRuns: 1,
    capacityLimit: 5,
    loadPct: 20,
    acceptability: 'available',
    weeklyTokens: 42000,
    weeklyCostUsd: 3.5,
  },
  ...over,
});

describe('buildStationContext', () => {
  it('没有选中的同事 → null，不造一段空上下文', () => {
    expect(buildStationContext(null)).toBeNull();
    expect(buildStationContext(undefined)).toBeNull();
  });

  it('如实搬运工位卡事实：身份 / 在做哪张单 / 状态 / 开跑时刻 / 最近原话', () => {
    const context = buildStationContext(station()) as string;

    expect(context).toContain('[盯盘上下文');
    expect(context).toContain('小码');
    expect(context).toContain('memberId: ai-1');
    expect(context).toContain('办公室聚合端点');
    expect(context).toContain('in_progress');
    expect(context).toContain('2026-09-15T06:20:00.000Z');
    expect(context).toContain('正在跑 npm test');
    expect(context).toContain('1 项阻断待决');
  });

  it('执行状态标明来源：快照可能滞后、事件是后到的增量', () => {
    expect(buildStationContext(station())).toContain('来自快照，可能滞后');
    expect(
      buildStationContext(
        station({ run: { ...station().run!, statusSource: 'event' } }),
      ),
    ).toContain('来自执行终态事件');
  });

  it('★ 不产出任何"卡了多久"——开跑时刻只作事实陈述', () => {
    const context = buildStationContext(station()) as string;

    // 工位卡没有阻塞起始时刻，附一个"已耗时"会让模型顺着说一个无据的时长
    expect(context).not.toMatch(/卡了\s*\d/);
    expect(context).not.toMatch(/已耗时|持续\s*\d|耗时\s*\d/);
  });

  it('步骤级进展照实说"第几步"，序号缺失时不编一个第 ? 步', () => {
    expect(
      buildStationContext(
        station({
          progress: {
            source: 'step',
            sequence: 3,
            label: '编译',
            at: 1,
            eventName: 'execution.step',
          },
        }),
      ),
    ).toContain('最近走到第 3 步「编译」');

    expect(
      buildStationContext(
        station({
          progress: { source: 'step', label: '编译', at: 1, eventName: 'execution.step' },
        }),
      ),
    ).toContain('最近走到「编译」这一步');
  });

  it('终态与原话分得开（前者是"结束了"，后者是"现在在干什么"）', () => {
    expect(
      buildStationContext(
        station({
          progress: {
            source: 'result',
            text: '已合并 PR #42',
            at: 1,
            eventName: 'runtime.execution.result',
          },
        }),
      ),
    ).toContain('执行终态：已合并 PR #42');
  });

  it('无进展事件、无在执行的事都明说，不拿状态顶替', () => {
    const idle = buildStationContext(station({ run: null, progress: null })) as string;

    expect(idle).toContain('当前没有在执行的事');
    expect(idle).toContain('暂无逐条执行进展');
  });

  it('只带"卡在哪"用得上的事实——信度分/本周用量/预算不进去', () => {
    const context = buildStationContext(station()) as string;

    // 上下文给得越多，模型越容易顺着数字编解释
    expect(context).not.toContain('88');
    expect(context).not.toContain('42000');
    expect(context).not.toContain('本周');
  });
});

describe('composeSurfaceDispatch', () => {
  it('未选中同事时只有正文与模型标记（与既有口径一致）', () => {
    expect(composeSurfaceDispatch('查一下门禁', { model: 'claude-sonnet-5' })).toBe(
      '查一下门禁\n\n[model: claude-sonnet-5]',
    );
  });

  it('选中同事时按 正文 → 上下文 → 模型标记 三段拼装', () => {
    const content = composeSurfaceDispatch('它为什么卡住了？', {
      model: 'claude-sonnet-5',
      station: station(),
    });

    const blocks = content.split('\n\n');
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toBe('它为什么卡住了？');
    expect(blocks[1]).toBe(buildStationContext(station()));
    expect(blocks[2]).toBe('[model: claude-sonnet-5]');
  });

  it("'auto' 不是要告知的模型名，不带标记", () => {
    expect(composeSurfaceDispatch('走', { model: 'auto' })).toBe('走');
    expect(composeSurfaceDispatch('走')).toBe('走');
  });
});
