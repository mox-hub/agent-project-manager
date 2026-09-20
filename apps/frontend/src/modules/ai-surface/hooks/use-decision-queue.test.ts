import { describe, expect, it } from 'vitest';
import type { Decision } from '@/shared/decision-card/types';
import { sortDecisionQueue } from './use-decision-queue';

/**
 * 「该你了」队列排序口径（ARCH-AISURFACE-001 §3.1）。
 *
 * 与收件箱**有意不同**：收件箱是"最新在前"的时间流；盯盘面问的是
 * "现在最卡你的是什么"，故同级内**等待最久在前**。本文件把这条口径钉住，
 * 免得日后被当成 bug"顺手改回最新在前"。
 */

function decision(over: Partial<Decision> & Pick<Decision, 'id'>): Decision {
  return {
    kind: 'acceptance',
    sourceId: over.id,
    status: 'pending',
    title: `待办 ${over.id}`,
    urgency: 'advisory',
    proposer: { type: 'system' },
    payload: {},
    createdAt: '2026-09-14T00:00:00.000Z',
    ...over,
  };
}

describe('sortDecisionQueue', () => {
  it('blocking 一律排在 advisory 之前（与发起时间无关）', () => {
    const queue = sortDecisionQueue([
      decision({ id: 'a', urgency: 'advisory', createdAt: '2026-09-01T00:00:00.000Z' }),
      decision({ id: 'b', urgency: 'blocking', createdAt: '2026-09-14T00:00:00.000Z' }),
    ]);

    expect(queue.map((d) => d.id)).toEqual(['b', 'a']);
  });

  it('同紧迫度内：等待最久的排最前（这才是"最急"）', () => {
    const queue = sortDecisionQueue([
      decision({ id: 'new', createdAt: '2026-09-14T10:00:00.000Z' }),
      decision({ id: 'old', createdAt: '2026-09-10T10:00:00.000Z' }),
      decision({ id: 'mid', createdAt: '2026-09-12T10:00:00.000Z' }),
    ]);

    expect(queue.map((d) => d.id)).toEqual(['old', 'mid', 'new']);
  });

  it('createdAt 不可解析时排到同级末尾，不冒充"最急"', () => {
    const queue = sortDecisionQueue([
      decision({ id: 'broken', createdAt: '不是时间' }),
      decision({ id: 'ok', createdAt: '2026-09-13T10:00:00.000Z' }),
    ]);

    expect(queue.map((d) => d.id)).toEqual(['ok', 'broken']);
  });

  it('两个都不可解析时保持彼此稳定（不抛错）', () => {
    const queue = sortDecisionQueue([
      decision({ id: 'x', createdAt: '' }),
      decision({ id: 'y', createdAt: 'oops' }),
    ]);

    expect(queue).toHaveLength(2);
  });

  it('不改动入参数组（纯函数）', () => {
    const input = [
      decision({ id: 'new', createdAt: '2026-09-14T10:00:00.000Z' }),
      decision({ id: 'old', createdAt: '2026-09-10T10:00:00.000Z' }),
    ];
    const snapshot = input.map((d) => d.id);

    sortDecisionQueue(input);

    expect(input.map((d) => d.id)).toEqual(snapshot);
  });

  it('空列表给空列表', () => {
    expect(sortDecisionQueue([])).toEqual([]);
  });
});
