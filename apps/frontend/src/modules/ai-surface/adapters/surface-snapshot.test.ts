import { describe, expect, it } from 'vitest';
import type { StationCard } from './office-to-station';
import type { PipelineLane } from '../hooks/use-pipeline-lanes';
import type { DecisionQueue } from '../hooks/use-decision-queue';
import type { Decision } from '@/shared/decision-card/types';
import { buildSurfaceSnapshot, snapshotHasFacts } from './surface-snapshot';

/**
 * 叙述事实快照的诚实性守卫（ARCH-AISURFACE-001 §3.3 约束①）。
 *
 * 这里守的是**叙事的地基**：模型只被允许翻译这份快照。所以快照一旦把"没取到"
 * 说成 0、把"我不认识的档位"并进"在干活"、或者凭空造出一个"卡了多久"的时长，
 * 模型会忠实地把这些谎话润色成人话讲给用户——错误发生在这一层，却由 AI 的口说出来。
 */

const station = (over: Partial<StationCard> = {}): StationCard => ({
  memberId: 'ai-1',
  displayName: '小码',
  title: '全栈工程师',
  status: 'working',
  blocking: 0,
  advisory: 0,
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

const lane = (over: Partial<PipelineLane> = {}): PipelineLane => ({
  stageNumber: '04',
  to: '/app/executions',
  label: '执行记录',
  hint: 'AI 在跑什么',
  count: 12,
  blocked: 1,
  source: 'GET /execution/runs · total',
  ...over,
});

const decision = (over: Partial<Decision> = {}): Decision =>
  ({
    id: 'release:rel-1',
    kind: 'release',
    sourceId: 'rel-1',
    status: 'pending',
    title: '合并登录页分支',
    urgency: 'blocking',
    proposer: { type: 'ai_agent' },
    payload: {},
    createdAt: '2026-09-15T05:00:00.000Z',
    ...over,
  }) as Decision;

const queue = (over: Partial<DecisionQueue> = {}): DecisionQueue => ({
  items: [],
  total: 0,
  blocking: 0,
  advisory: 0,
  hiddenCount: 0,
  ...over,
});

const build = (
  over: Partial<Parameters<typeof buildSurfaceSnapshot>[0]> = {},
) =>
  buildSurfaceSnapshot({
    stations: [],
    colleaguesReady: true,
    lanes: [],
    lanesPending: false,
    lanesError: false,
    queue: queue(),
    queueReady: true,
    ...over,
  });

describe('buildSurfaceSnapshot（同事态）', () => {
  it('按 office 原样档位计数，阻塞同事单独报数', () => {
    const snapshot = build({
      stations: [
        station({ memberId: 'a', displayName: '小码', status: 'working' }),
        station({ memberId: 'b', displayName: '小周', status: 'needYou', blocking: 2 }),
        station({ memberId: 'c', displayName: '小测', status: 'idle' }),
      ],
    });

    expect(snapshot.colleagues).toEqual({
      total: 3,
      needYou: 1,
      working: 1,
      suggestions: 0,
      idle: 1,
      other: 0,
      blocked: 1,
    });
  });

  it('不认识的档位进 other，**不**并进 working 凑数', () => {
    const snapshot = build({
      stations: [
        station({ memberId: 'a', status: 'working' }),
        // 服务端将来新增档位时，这里必须是"我不认识"而不是"他在干活"
        station({ memberId: 'b', status: 'paused' as never }),
      ],
    });

    expect(snapshot.colleagues?.other).toBe(1);
    expect(snapshot.colleagues?.working).toBe(1);
    expect(snapshot.colleagues?.total).toBe(2);
  });

  it('逐人一行带出真实在场事实：在做哪张单、开跑时刻、最后一句进展', () => {
    const snapshot = build({ stations: [station()] });

    expect(snapshot.roster[0]).toEqual({
      name: '小码',
      status: 'working',
      task: '办公室聚合端点',
      runStatus: 'in_progress',
      runStatusSource: 'snapshot',
      runStartedAt: '2026-09-15T06:20:00.000Z',
      lastProgress: '正在跑 npm test',
      lastProgressAt: '2026-09-15T06:41:00.000Z',
      lastStep: null,
      lastStepSequence: null,
      blocking: 0,
    });
  });

  it('只有状态级进度时 lastProgress 为 null——不拿 runStatus 冒充一句话', () => {
    const snapshot = build({
      stations: [station({ progress: null, run: null })],
    });

    expect(snapshot.roster[0].lastProgress).toBeNull();
    expect(snapshot.roster[0].lastProgressAt).toBeNull();
    expect(snapshot.roster[0].task).toBeNull();
  });

  it('★ 步骤级事件不是"原话"：进 lastStep，**不**冒充 lastProgress', () => {
    const snapshot = build({
      stations: [
        station({
          progress: {
            source: 'step',
            sequence: 3,
            label: '编译',
            status: 'running',
            at: Date.parse('2026-09-15T06:41:00.000Z'),
            eventName: 'execution.step',
          },
        }),
      ],
    });

    // 「走到第 3 步」和「它说了什么」不是同一件事，合成一个字段就会把
    // 步骤级粒度说成有实时日志（§4.6 天花板）
    expect(snapshot.roster[0].lastStep).toBe('编译');
    expect(snapshot.roster[0].lastStepSequence).toBe(3);
    expect(snapshot.roster[0].lastProgress).toBeNull();
    // 没有原话就没有原话的时刻——不给步骤事件的时间冒充
    expect(snapshot.roster[0].lastProgressAt).toBeNull();
  });

  it('快照不产出任何"卡了多久"的时长——只有两个可陈述的时刻', () => {
    const snapshot = build({ stations: [station()] });
    const entry = snapshot.roster[0];

    // 有 startedAt 与 lastProgressAt，但**没有** elapsed/duration/blockedSince 之类
    expect(Object.keys(entry).sort()).toEqual(
      [
        'blocking',
        'lastProgress',
        'lastProgressAt',
        'lastStep',
        'lastStepSequence',
        'name',
        'runStartedAt',
        'runStatus',
        'runStatusSource',
        'status',
        'task',
      ].sort(),
    );
  });
});

describe('buildSurfaceSnapshot（未就绪 ≠ 空）', () => {
  it('同事未就绪 → colleagues 为 null 且写明缺口，不是 0 个人', () => {
    const snapshot = build({
      stations: [],
      colleaguesReady: false,
    });

    expect(snapshot.colleagues).toBeNull();
    expect(snapshot.roster).toEqual([]);
    expect(snapshot.gaps.join()).toContain('同事状态还没取到');
  });

  it('待办未就绪 → needsYou 为 null，不把兜底的 0 当事实', () => {
    // useDecisionQueue 在未就绪时会把 total 兜成 0——这是本用例要挡的陷阱
    const snapshot = build({
      queue: queue({ total: 0, blocking: 0, advisory: 0 }),
      queueReady: false,
    });

    expect(snapshot.needsYou).toBeNull();
    expect(snapshot.gaps.join()).toContain('还没取到');
  });

  it('待办未全部列出时写明还有多少件没列——不静默截断', () => {
    const snapshot = build({
      queue: queue({
        items: [decision()],
        total: 7,
        blocking: 3,
        advisory: 4,
        hiddenCount: 6,
      }),
    });

    expect(snapshot.needsYou?.total).toBe(7);
    expect(snapshot.needsYou?.top).toHaveLength(1);
    expect(snapshot.needsYou?.top[0]).toMatchObject({
      id: 'release:rel-1',
      urgency: 'blocking',
      waitingSince: '2026-09-15T05:00:00.000Z',
    });
    expect(snapshot.gaps.join()).toContain('只列出了最急的 1 件');
  });

  it('createdAt 不可解析时 waitingSince 为 null——不拿当前时间顶替', () => {
    const snapshot = build({
      queue: queue({ items: [decision({ createdAt: '不是时间' })], total: 1 }),
    });

    expect(snapshot.needsYou?.top[0].waitingSince).toBeNull();
  });
});

describe('buildSurfaceSnapshot（六站与缺口）', () => {
  it('窗口内计数必须写进缺口（否则"1 个阻塞"会被读成全量）', () => {
    const snapshot = build({
      lanes: [lane({ blockedScopeNote: '列表窗口内（100/240）' })],
    });

    expect(snapshot.lanes[0]).toEqual({
      label: '执行记录',
      count: 12,
      blocked: 1,
    });
    expect(snapshot.gaps.join()).toContain('列表窗口内（100/240）');
  });

  it('泳道未取齐 / 取失败分别有不同说法', () => {
    expect(build({ lanesPending: true }).gaps.join()).toContain('还没取齐');
    expect(build({ lanesError: true }).gaps.join()).toContain('没取到');
  });

  it('有在执行却一条逐事件进展都没有 → 明说这是粒度上限（§4.6 天花板）', () => {
    const snapshot = build({
      stations: [station({ progress: null })],
    });

    expect(snapshot.gaps.join()).toContain('只有状态级进度');
  });

  it('★ 有步骤事件时不能说成"没有逐条进展"——两档天花板措辞必须不同', () => {
    const snapshot = build({
      stations: [
        station({
          progress: {
            source: 'step',
            label: '编译',
            at: Date.parse('2026-09-15T06:41:00.000Z'),
            eventName: 'execution.step',
          },
        }),
      ],
    });

    // 明明在报步骤却说"没有任何进展"是低报；两句话必须分得开
    expect(snapshot.gaps.join()).toContain('进展只到步骤级');
    expect(snapshot.gaps.join()).not.toContain('只有状态级进度');
  });

  it('缺口去重——同一句话不重复塞进 prompt', () => {
    const snapshot = build({
      lanes: [
        lane({ to: '/app/a', label: 'A', blockedScopeNote: '列表窗口内（1/9）' }),
        lane({ to: '/app/b', label: 'B', blockedScopeNote: '列表窗口内（1/9）' }),
      ],
    });

    const windowGaps = snapshot.gaps.filter((g) => g.includes('列表窗口内（1/9）'));
    expect(windowGaps).toHaveLength(2); // 两站各一条（站点名不同，不算重复）
    expect(new Set(snapshot.gaps).size).toBe(snapshot.gaps.length);
  });
});

describe('snapshotHasFacts', () => {
  it('有同事 / 有待办 / 有非零站点计数 → 值得讲', () => {
    expect(snapshotHasFacts(build({ stations: [station()] }))).toBe(true);
    expect(
      snapshotHasFacts(build({ queue: queue({ total: 1, items: [decision()] }) })),
    ).toBe(true);
    expect(snapshotHasFacts(build({ lanes: [lane({ count: 3 })] }))).toBe(true);
  });

  it('什么都没取到 → 不该去调模型（省一轮 token，也不编话）', () => {
    expect(snapshotHasFacts(build())).toBe(false);
    expect(
      snapshotHasFacts(build({ lanes: [lane({ count: 0, blocked: 0 })] })),
    ).toBe(false);
  });
});
