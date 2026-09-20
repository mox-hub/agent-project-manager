import { describe, expect, it } from 'vitest';
import type { OfficeColleague } from '@/modules/office/api/office-api';
import type { SurfaceFeedItem } from '../hooks/use-surface-feed';
import { pickStationProgress, toStationCard, toStationCards } from './office-to-station';

/**
 * 工位卡接真的诚实性守卫（ARCH-AISURFACE-001 §4.7）。
 *
 * 本文件的用例守两类事：① 真实字段**原样**透传（含缺省不兜底）；
 * ② 服务端没有的字段**不得**凭空出现——原实现里那些 `statusText`/`tokensUsed`/
 * `specialties` 正是自造口径，这里的断言防止它们借道适配器回流。
 */

function colleague(overrides: Partial<OfficeColleague> = {}): OfficeColleague {
  return {
    memberId: 'ai-1',
    displayName: '小码',
    title: '全栈工程师',
    executionRole: 'coder',
    trustLevel: 2,
    trustScore: 88,
    status: 'working',
    blocking: 1,
    advisory: 2,
    capacity: {
      activeRuns: 2,
      capacityLimit: 5,
      loadPct: 40,
      weeklyTokens: 42000,
      weeklyCostUsd: 3.5,
      acceptability: 'available',
    },
    currentRun: {
      id: 'run-1',
      goal: '实现办公室接口',
      status: 'in_progress',
      taskTitle: '办公室聚合端点',
    },
    lastRunAt: '2026-09-06T08:00:00Z',
    ...overrides,
  };
}

function feedItem(
  overrides: Partial<SurfaceFeedItem> & { id: string; at: number },
): SurfaceFeedItem {
  return {
    kind: 'run',
    eventName: 'execution.run.updated',
    ...overrides,
  };
}

describe('toStationCard', () => {
  it('原样透传 office 口径的真实字段', () => {
    const card = toStationCard(colleague(), []);

    expect(card.memberId).toBe('ai-1');
    expect(card.displayName).toBe('小码');
    expect(card.status).toBe('working');
    expect(card.blocking).toBe(1);
    expect(card.advisory).toBe(2);
    expect(card.trustScore).toBe(88);
    expect(card.capacity.weeklyTokens).toBe(42000);
    expect(card.capacity.weeklyCostUsd).toBe(3.5);
    expect(card.capacity.loadPct).toBe(40);
    expect(card.capacity.acceptability).toBe('available');
  });

  it('trustScore 缺失时保持 undefined——不拿默认分兜底', () => {
    const card = toStationCard(colleague({ trustScore: undefined }), []);

    // 原实现缺分会落回写死的 98.2/96.5/93.8/97.4；此处必须是「没有」
    expect(card.trustScore).toBeUndefined();
    expect(card).not.toHaveProperty('statusText');
    expect(card).not.toHaveProperty('specialties');
    expect(card).not.toHaveProperty('recentThought');
  });

  it('预算占比只透传不推算——项目域有则带、无则 undefined', () => {
    const withBudget = colleague({
      capacity: {
        activeRuns: 1,
        capacityLimit: 5,
        loadPct: 20,
        weeklyTokens: 1000,
        weeklyCostUsd: 0.5,
        budgetUsagePct: 73,
        acceptability: 'busy',
      },
    });
    expect(toStationCard(withBudget, []).capacity.budgetUsagePct).toBe(73);

    // 工作区域（无 projectId）服务端不返回预算 → 不得由 token 数倒推出一个百分比
    expect(toStationCard(colleague(), []).capacity.budgetUsagePct).toBeUndefined();
  });

  it('run 标签优先工单标题，退化到执行目标', () => {
    expect(toStationCard(colleague(), []).run?.label).toBe('办公室聚合端点');

    const noTitle = colleague({
      currentRun: { id: 'run-1', goal: '跑一遍全量测试', status: 'in_progress' },
    });
    expect(toStationCard(noTitle, []).run?.label).toBe('跑一遍全量测试');
  });

  it('执行状态原样透传，不美化成自造档位', () => {
    // 原实现把状态写成 reasoning/executing/auditing——服务端没有这三个值
    expect(toStationCard(colleague(), []).run?.status).toBe('in_progress');
  });

  it('无当前执行时 run 与 progress 均为 null', () => {
    const card = toStationCard(colleague({ currentRun: null }), []);

    expect(card.run).toBeNull();
    expect(card.progress).toBeNull();
  });
});

describe('pickStationProgress', () => {
  it('运行时原话优先，并带上溯源事件名', () => {
    const items: SurfaceFeedItem[] = [
      feedItem({
        id: 'e1',
        at: 2000,
        kind: 'runtimeEvent',
        eventName: 'runtime.execution.event',
        subjectId: 'run-1',
        dataText: '正在写入 12 个文件',
      }),
    ];

    expect(pickStationProgress(items, 'run-1')).toEqual({
      source: 'runtime',
      text: '正在写入 12 个文件',
      at: 2000,
      eventName: 'runtime.execution.event',
    });
  });

  it('无运行时原话时退化到步骤事件（结构与状态原样）', () => {
    const items: SurfaceFeedItem[] = [
      feedItem({
        id: 'e1',
        at: 3000,
        kind: 'step',
        eventName: 'execution.step.updated',
        subjectId: 'run-1',
        sequence: 3,
        stepLabel: '编译',
        status: 'running',
      }),
    ];

    expect(pickStationProgress(items, 'run-1')).toEqual({
      source: 'step',
      sequence: 3,
      label: '编译',
      status: 'running',
      at: 3000,
      eventName: 'execution.step.updated',
    });
  });

  it('运行时原话优先于更新更晚的步骤事件（信息量优先，非时刻优先）', () => {
    const items: SurfaceFeedItem[] = [
      feedItem({
        id: 'step-1',
        at: 5000,
        kind: 'step',
        subjectId: 'run-1',
        stepLabel: '测试',
      }),
      feedItem({
        id: 'rt-1',
        at: 4000,
        kind: 'runtimeEvent',
        subjectId: 'run-1',
        dataText: '门禁已通过',
      }),
    ];

    const progress = pickStationProgress(items, 'run-1');
    expect(progress?.source).toBe('runtime');
    expect(progress?.at).toBe(4000);
  });

  it('同类多事件取最新（store 为新→旧排列）', () => {
    const items: SurfaceFeedItem[] = [
      feedItem({ id: 'rt-new', at: 9000, kind: 'runtimeEvent', subjectId: 'run-1', dataText: '新' }),
      feedItem({ id: 'rt-old', at: 1000, kind: 'runtimeEvent', subjectId: 'run-1', dataText: '旧' }),
    ];

    const progress = pickStationProgress(items, 'run-1');
    expect(progress?.source === 'runtime' ? progress.text : '').toBe('新');
  });

  it('按 subjectId 精确匹配——别的执行的进展不得串台', () => {
    const items: SurfaceFeedItem[] = [
      feedItem({
        id: 'other',
        at: 9000,
        kind: 'runtimeEvent',
        subjectId: 'run-999',
        dataText: '别人的进展',
      }),
    ];

    expect(pickStationProgress(items, 'run-1')).toBeNull();
  });

  it('无任何关联事件时返回 null——由组件显示"暂无进展"，不编叙述', () => {
    const items: SurfaceFeedItem[] = [
      feedItem({ id: 'x', at: 1000, kind: 'run', subjectId: 'run-1', status: 'in_progress' }),
    ];

    expect(pickStationProgress(items, 'run-1')).toBeNull();
  });
});

describe('执行终态合并（runtime.execution.result，S2 成本口径）', () => {
  const resultItem = (
    overrides: Partial<SurfaceFeedItem> & { id: string; at: number },
  ): SurfaceFeedItem =>
    feedItem({
      kind: 'result',
      eventName: 'runtime.execution.result',
      subjectId: 'run-1',
      status: 'completed',
      dataText: '任务执行完成',
      ...overrides,
    });

  it('终态优先于在途进展：干完了就不该再显示"正在写入…"', () => {
    const items: SurfaceFeedItem[] = [
      resultItem({ id: 'r1', at: 8000 }),
      feedItem({
        id: 'rt-1',
        at: 7000,
        kind: 'runtimeEvent',
        subjectId: 'run-1',
        dataText: '正在写入 12 个文件',
      }),
    ];

    expect(pickStationProgress(items, 'run-1')).toEqual({
      source: 'result',
      text: '任务执行完成',
      status: 'completed',
      usage: undefined,
      artifactCount: undefined,
      evidenceCount: undefined,
      at: 8000,
      eventName: 'runtime.execution.result',
    });
  });

  /**
   * 关键边界：投递延迟会让在途事件**晚于**终态到达。若按"时刻最新者赢"，
   * 已结束的执行会重新显示成进行中——这正是本规则要挡的。
   */
  it('迟到的在途事件不得盖回终态（终态之后该 run 没有未来）', () => {
    const items: SurfaceFeedItem[] = [
      feedItem({
        id: 'rt-late',
        at: 9000,
        kind: 'runtimeEvent',
        subjectId: 'run-1',
        dataText: '正在重试第 3 步',
      }),
      resultItem({ id: 'r1', at: 8000 }),
    ];

    expect(pickStationProgress(items, 'run-1')?.source).toBe('result');
  });

  it('终态里的真实用量原样带出（有才带，不补 0）', () => {
    const withUsage = pickStationProgress(
      [
        resultItem({
          id: 'r1',
          at: 8000,
          detail: {
            usage: { promptTokens: 900, completionTokens: 100, totalTokens: 1000, costUsd: 0.42 },
            artifactCount: 3,
          },
        }),
      ],
      'run-1',
    );

    expect(withUsage?.source === 'result' ? withUsage.usage : undefined).toEqual({
      promptTokens: 900,
      completionTokens: 100,
      totalTokens: 1000,
      costUsd: 0.42,
    });
    expect(withUsage?.source === 'result' ? withUsage.artifactCount : undefined).toBe(3);

    // 未上报 usage → 字段缺席（不是 0）；detail 里没有的键一个都不造
    const without = pickStationProgress([resultItem({ id: 'r2', at: 8000 })], 'run-1');
    expect(without?.source === 'result' ? without.usage : 'sentinel').toBeUndefined();
    expect(
      without?.source === 'result' ? without.artifactCount : 'sentinel',
    ).toBeUndefined();
  });

  it('run.status 被终态覆写，并把来源标成 event（快照值已滞后）', () => {
    // office 快照说 in_progress，终态事件说 completed → 以事件为准
    const card = toStationCard(colleague(), [resultItem({ id: 'r1', at: 8000 })]);

    expect(card.run?.status).toBe('completed');
    expect(card.run?.statusSource).toBe('event');
  });

  it('无终态事件时 run.status 仍取快照，来源标成 snapshot', () => {
    const card = toStationCard(colleague(), []);

    expect(card.run?.status).toBe('in_progress');
    expect(card.run?.statusSource).toBe('snapshot');
  });

  it('终态缺 status 时不编一个终态值——run.status 退回快照', () => {
    const card = toStationCard(colleague(), [
      resultItem({ id: 'r1', at: 8000, status: undefined }),
    ]);

    expect(card.run?.status).toBe('in_progress');
    expect(card.run?.statusSource).toBe('snapshot');
  });
});

describe('toStationCards', () => {
  it('按同事顺序逐个转换', () => {
    const cards = toStationCards(
      [colleague({ memberId: 'ai-1' }), colleague({ memberId: 'ai-2' })],
      [],
    );

    expect(cards.map((c) => c.memberId)).toEqual(['ai-1', 'ai-2']);
  });

  it('空列表 → 空数组（页面据此显示空态，而不是造几个假同事）', () => {
    expect(toStationCards([], [])).toEqual([]);
  });
});
