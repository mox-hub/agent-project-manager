import { describe, expect, it } from 'vitest';
import { DomainEventTypes } from '@apm/shared/events/domain-events';
import { PIPELINE_STAGES } from '@/shared/layout/pipeline-stages';
import type { OfficeColleague } from '@/modules/office/api/office-api';
import type { Decision } from '@/shared/decision-card/types';
import {
  REPLAY_SOURCE_LABEL,
  type ScreenplayFrame,
  type ScreenplayLaneFacts,
} from './screenplay-format';
import { buildFrameFacts } from './screenplay-facts';

const STORY_AT_MS = Date.parse('2026-09-10T09:00:00.000Z');

const laneKeys = (
  over: Record<string, ScreenplayLaneFacts> = {},
): Record<string, ScreenplayLaneFacts> => ({
  ...(Object.fromEntries(
    PIPELINE_STAGES.map((s) => [s.to, { count: 0, blocked: 0 }]),
  ) as Record<string, ScreenplayLaneFacts>),
  ...over,
});

const frame = (over: Partial<ScreenplayFrame> = {}): ScreenplayFrame => ({
  atMs: 0,
  stageNumber: '01',
  title: '一句话需求',
  narration: { headline: '刚收到一条需求', highlights: [], blockers: [], needsYou: [], honestGaps: [], source: 'ai' },
  lanes: laneKeys(),
  colleagues: [],
  events: [],
  decisions: [],
  ...over,
});

const colleague = (): OfficeColleague => ({
  memberId: 'ai-1',
  displayName: '小码',
  title: '全栈工程师',
  trustScore: 88,
  status: 'working',
  blocking: 0,
  advisory: 0,
  capacity: {
    activeRuns: 1,
    capacityLimit: 5,
    loadPct: 20,
    weeklyTokens: 42_000,
    weeklyCostUsd: 3.5,
    acceptability: 'available',
  },
  currentRun: { id: 'run-1', goal: '实现导出', status: 'in_progress', taskTitle: '导出' },
});

const decision = (id: string, urgency: Decision['urgency'], createdAt: string): Decision => ({
  id,
  kind: 'acceptance',
  sourceId: id,
  status: 'pending',
  title: `待办 ${id}`,
  urgency,
  proposer: { type: 'ai_agent', id: 'ai-1', name: '小码' },
  payload: {},
  createdAt,
});

describe('buildFrameFacts · 溯源改写', () => {
  it('★ 六站计数一律标注为回放剧本——沿用实况的端点名就是让悬停提示说假话', () => {
    const facts = buildFrameFacts(frame(), STORY_AT_MS);
    expect(facts.lanes).toHaveLength(PIPELINE_STAGES.length);
    for (const lane of facts.lanes) {
      expect(lane.source).toBe(REPLAY_SOURCE_LABEL);
      // 反例：实况侧这些格子写的是「GET /documents/stats」这类真实端点
      expect(lane.source).not.toMatch(/GET |POST |\/_api/);
    }
  });

  it('站清单与顺序取自唯一定义源，不被剧本的键序左右', () => {
    const facts = buildFrameFacts(frame(), STORY_AT_MS);
    expect(facts.lanes.map((l) => l.stageNumber)).toEqual(
      PIPELINE_STAGES.map((s) => s.stageNumber),
    );
    expect(facts.lanes.map((l) => l.to)).toEqual(PIPELINE_STAGES.map((s) => s.to));
  });
});

describe('buildFrameFacts · 诚实粒度', () => {
  it('★ count 为 null 时保持 null，绝不落成 0', () => {
    const facts = buildFrameFacts(
      frame({ lanes: laneKeys({ '/app/acceptance': { count: null, blocked: null } }) }),
      STORY_AT_MS,
    );
    const acceptance = facts.lanes.find((l) => l.to === '/app/acceptance');
    expect(acceptance?.count).toBeNull();
    // 0 在这里是有口径的"零"，与"没有口径"是两件事，混同就是把查不到读成一条都没有
    expect(acceptance?.count).not.toBe(0);
  });

  it('count 为 0 时如实给 0（有口径的零不许被当成缺口径）', () => {
    const facts = buildFrameFacts(frame(), STORY_AT_MS);
    expect(facts.lanes[0].count).toBe(0);
    expect(facts.lanes[0].blocked).toBe(0);
  });

  it('blocked 为 null 时补上标准口径说明，不让破折号悬空', () => {
    const facts = buildFrameFacts(
      frame({ lanes: laneKeys({ '/app/intake': { count: 1, blocked: null } }) }),
      STORY_AT_MS,
    );
    const intake = facts.lanes.find((l) => l.to === '/app/intake');
    expect(intake?.blocked).toBeNull();
    expect(intake?.blockedNote).toBeTruthy();
  });

  it('blocked 有值时不给 blockedNote（0 与 3 都不需要解释口径）', () => {
    const facts = buildFrameFacts(frame({ lanes: laneKeys({ '/app/intake': { count: 1, blocked: 3 } }) }), STORY_AT_MS);
    const intake = facts.lanes.find((l) => l.to === '/app/intake');
    expect(intake?.blocked).toBe(3);
    expect(intake?.blockedNote).toBeUndefined();
  });
});

describe('buildFrameFacts · 事件投影', () => {
  it('事件经**同一个**归一化器进入 feed，时刻 = 剧本起点 + 帧内偏移', () => {
    const facts = buildFrameFacts(
      frame({
        events: [
          {
            eventName: DomainEventTypes.ExecutionRunCreated,
            payload: { executionRunId: 'run-1', projectId: 'p1' },
            atMs: 16_000,
          },
        ],
      }),
      STORY_AT_MS,
    );
    expect(facts.feed).toHaveLength(1);
    expect(facts.feed[0].kind).toBe('run');
    expect(facts.feed[0].subjectId).toBe('run-1');
    expect(facts.feed[0].at).toBe(STORY_AT_MS + 16_000);
  });

  it('★ 写错事件名的表现是"这一帧凭空少一条进展"——必须报出来，不静默丢', () => {
    const facts = buildFrameFacts(
      frame({
        events: [
          { eventName: 'execution.complete', payload: { executionRunId: 'run-1' }, atMs: 1 },
          {
            eventName: DomainEventTypes.ExecutionRunCreated,
            payload: { executionRunId: 'run-1' },
            atMs: 2,
          },
        ],
      }),
      STORY_AT_MS,
    );
    expect(facts.feed).toHaveLength(1);
    expect(facts.droppedEvents).toEqual(['execution.complete']);
  });

  it('载荷不是对象同样计入丢弃（不是"没有进展"，是事件不可读）', () => {
    const facts = buildFrameFacts(
      frame({ events: [{ eventName: DomainEventTypes.ExecutionRunCreated, payload: undefined as never, atMs: 1 }] }),
      STORY_AT_MS,
    );
    expect(facts.feed).toEqual([]);
    expect(facts.droppedEvents).toHaveLength(1);
  });
});

describe('buildFrameFacts · 工位与待办', () => {
  it('同事经**同一个** toStationCards 变成工位卡（演示里那张卡就是真项目里那张）', () => {
    const facts = buildFrameFacts(frame({ colleagues: [colleague()] }), STORY_AT_MS);
    expect(facts.stations).toHaveLength(1);
    expect(facts.stations[0].memberId).toBe('ai-1');
  });

  it('★ 待办走同一个 sortDecisionQueue：blocking 排在 advisory 前', () => {
    const facts = buildFrameFacts(
      frame({
        decisions: [
          decision('a', 'advisory', '2026-09-10T08:00:00.000Z'),
          decision('b', 'blocking', '2026-09-10T08:59:00.000Z'),
        ],
      }),
      STORY_AT_MS,
    );
    expect(facts.queue.items.map((d) => d.id)).toEqual(['b', 'a']);
    expect(facts.queue.blocking).toBe(1);
    expect(facts.queue.advisory).toBe(1);
    expect(facts.queue.total).toBe(2);
  });

  it('回放不存在分页：hiddenCount 恒 0 且 total 就是条数', () => {
    const facts = buildFrameFacts(frame({ decisions: [decision('a', 'blocking', '2026-09-10T08:00:00.000Z')] }), STORY_AT_MS);
    expect(facts.queue.hiddenCount).toBe(0);
    expect(facts.queue.total).toBe(facts.queue.items.length);
  });
});
