import { describe, expect, it } from 'vitest';
import type { SurfaceSnapshot } from './surface-snapshot';
import {
  buildTemplateNarration,
  parseSurfaceNarration,
} from './surface-narration';

/**
 * 叙述层的两条守卫（ARCH-AISURFACE-001 §3.3）。
 *
 * ① **解析**：模型输出可以不成形，可以被丢弃，但**不许**把编造的 `decisionId` 放行——
 *    用户点下去会打开另一张卡，"AI 说错了"里最贵的一种。
 * ② **降级**：模型挂了要能用同一份事实说出通顺的话，且**一个数都不新算**。
 */

const snapshot = (over: Partial<SurfaceSnapshot> = {}): SurfaceSnapshot => ({
  colleagues: {
    total: 3,
    needYou: 1,
    working: 2,
    suggestions: 0,
    idle: 0,
    other: 0,
    blocked: 1,
  },
  roster: [
    {
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
    },
    {
      name: '小周',
      status: 'needYou',
      task: '登录页',
      runStatus: 'blocked',
      runStatusSource: 'snapshot',
      runStartedAt: '2026-09-15T05:00:00.000Z',
      lastProgress: null,
      lastProgressAt: null,
      lastStep: null,
      lastStepSequence: null,
      blocking: 2,
    },
  ],
  lanes: [],
  needsYou: {
    total: 2,
    blocking: 1,
    advisory: 1,
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
  gaps: ['执行记录的阻塞数只覆盖列表窗口内（100/240），不是全部'],
  ...over,
});

describe('parseSurfaceNarration', () => {
  it('完整输出逐字段搬运，并标 source=ai', () => {
    const narration = parseSurfaceNarration(
      {
        headline: '2 个人在干活，1 件事卡着你',
        highlights: ['登录页卡在测试没过'],
        blockers: [
          {
            what: '登录页卡在测试',
            who: '小周',
            since: '最后一条进展在 09-15T05:00',
            why: '接口没通',
            whatYouCanDo: '去验收页看看',
          },
        ],
        needsYou: [
          {
            decisionId: 'release:rel-1',
            oneLineWhy: '发版门禁没过',
            urgency: 'blocking',
          },
        ],
        honestGaps: ['只有状态级进度，没有逐条进展'],
      },
      snapshot(),
    );

    expect(narration).toMatchObject({
      headline: '2 个人在干活，1 件事卡着你',
      source: 'ai',
    });
    expect(narration?.blockers[0].what).toBe('登录页卡在测试');
    expect(narration?.needsYou[0].decisionId).toBe('release:rel-1');
  });

  it('★ 防幻觉闸门：快照里没有的 decisionId 整条丢弃', () => {
    const narration = parseSurfaceNarration(
      {
        headline: '有 3 件事等你',
        needsYou: [
          { decisionId: 'release:rel-1', oneLineWhy: '真的' },
          { decisionId: 'acceptance:编造的-id', oneLineWhy: '模型编的' },
        ],
      },
      snapshot(),
    );

    // 只留真的那一条——放行编造 id 会让用户点开另一张卡
    expect(narration?.needsYou).toEqual([
      { decisionId: 'release:rel-1', oneLineWhy: '真的', urgency: undefined },
    ]);
  });

  it('待办快照未就绪时，needsYou 全部被挡（white list 为空）', () => {
    const narration = parseSurfaceNarration(
      {
        headline: '有 2 件事等你',
        needsYou: [{ decisionId: 'release:rel-1', oneLineWhy: '真的' }],
      },
      snapshot({ needsYou: null }),
    );

    expect(narration?.needsYou).toEqual([]);
    // headline 仍在——挡的是可点击的 id，不是整段话
    expect(narration?.headline).toBe('有 2 件事等你');
  });

  it('headline 缺失/空白 → null，交由调用方降级（不半显示）', () => {
    expect(parseSurfaceNarration({ highlights: ['x'] }, snapshot())).toBeNull();
    expect(
      parseSurfaceNarration({ headline: '   ' }, snapshot()),
    ).toBeNull();
    expect(parseSurfaceNarration(undefined, snapshot())).toBeNull();
  });

  it('空串当缺失、缺 what 的阻塞项丢弃、数组限长', () => {
    const narration = parseSurfaceNarration(
      {
        headline: '总述',
        highlights: ['a', '  ', 'b', 'c', 'd'],
        blockers: [{ who: '小周' }, { what: '真的事' }],
      },
      snapshot(),
    );

    expect(narration?.highlights).toEqual(['a', 'b', 'c']);
    expect(narration?.blockers).toEqual([
      { what: '真的事', who: undefined, since: undefined, why: undefined, whatYouCanDo: undefined },
    ]);
  });
});

describe('buildTemplateNarration（降级态）', () => {
  it('用同一份事实造句：同事态 + 待办数', () => {
    const narration = buildTemplateNarration(snapshot());

    expect(narration.source).toBe('template');
    expect(narration.headline).toContain('3 位 AI 同事');
    expect(narration.headline).toContain('2 位在干活');
    expect(narration.headline).toContain('1 位在等你');
    expect(narration.headline).toContain('有 2 件事等你拍板');
  });

  it('不认识的档位照实说，**不**折算成"在干活"', () => {
    const narration = buildTemplateNarration(
      snapshot({
        colleagues: {
          total: 2,
          needYou: 0,
          working: 1,
          suggestions: 0,
          idle: 0,
          other: 1,
          blocked: 0,
        },
      }),
    );

    expect(narration.headline).toContain('1 位状态未识别');
    expect(narration.headline).not.toContain('2 位在干活');
  });

  it('未取到的组明说"还没取到"，不报 0', () => {
    const narration = buildTemplateNarration(
      snapshot({ colleagues: null, needsYou: null }),
    );

    expect(narration.headline).toContain('同事状态还没取到');
    expect(narration.headline).toContain('待办清单还没取到');
  });

  it('阻塞项用开跑时刻做事实陈述，**不**说成"卡了多久"', () => {
    const narration = buildTemplateNarration(snapshot());
    const blocker = narration.blockers[0];

    expect(blocker.what).toContain('小周');
    expect(blocker.since).toContain('2026-09-15T05:00:00.000Z');
    // 快照没有阻塞起始时刻，任何"卡了 N 分钟"式的说法都是编的
    expect(JSON.stringify(narration)).not.toMatch(/卡了\s*\d/);
  });

  it('待办直接来自快照 top，不自己排一遍序（口径仍在 useDecisionQueue）', () => {
    const narration = buildTemplateNarration(snapshot());

    expect(narration.needsYou).toEqual([
      {
        decisionId: 'release:rel-1',
        oneLineWhy: '合并登录页分支',
        urgency: 'blocking',
      },
    ]);
  });

  it('缺口原样带出（模板不发明缺口，也不隐瞒）', () => {
    const narration = buildTemplateNarration(snapshot());

    expect(narration.honestGaps).toEqual([
      '执行记录的阻塞数只覆盖列表窗口内（100/240），不是全部',
    ]);
  });
});
