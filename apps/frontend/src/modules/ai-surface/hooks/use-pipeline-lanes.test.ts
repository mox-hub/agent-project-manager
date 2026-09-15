import { describe, expect, it } from 'vitest';
import { PIPELINE_STAGES } from '@/shared/layout/pipeline-stages';
import { derivePipelineLanes } from './use-pipeline-lanes';

/**
 * 六站泳道的诚实性守卫（ARCH-AISURFACE-001 §3.1 / §4.7）。
 *
 * 本文件守三条：① 站清单从唯一定义源派生（不重写一份六站字面量）；
 * ② `null`（无口径/未就绪）**绝不**渲染成 0；③ 无阻塞口径的站必须**解释原因**，
 * 不能静默省略——静默省略会被读成「无阻塞」。
 */

const laneOf = (lanes: ReturnType<typeof derivePipelineLanes>, to: string) => {
  const lane = lanes.find((l) => l.to === to);
  if (!lane) throw new Error(`missing lane ${to}`);
  return lane;
};

describe('derivePipelineLanes 站清单', () => {
  it('顺序、路由、标签逐一来自 PIPELINE_STAGES（不另起一份六站字面量）', () => {
    const lanes = derivePipelineLanes({});

    expect(lanes.map((l) => l.to)).toEqual(PIPELINE_STAGES.map((s) => s.to));
    expect(lanes.map((l) => l.stageNumber)).toEqual(PIPELINE_STAGES.map((s) => s.stageNumber));
    expect(lanes.map((l) => l.label)).toEqual(PIPELINE_STAGES.map((s) => s.labelFallback));
  });

  it('每一站都带溯源来源，供"你这数字哪来的"追问', () => {
    const lanes = derivePipelineLanes({});

    for (const lane of lanes) {
      expect(lane.source.length).toBeGreaterThan(0);
    }
  });
});

describe('derivePipelineLanes null 语义', () => {
  it('全部未就绪时计数为 null——不得兜成 0', () => {
    const lanes = derivePipelineLanes({});

    for (const lane of lanes) {
      expect(lane.count).toBeNull();
    }
  });

  it('服务端确实返回 0 时给 0（"有口径且为零"与"无口径"必须可分）', () => {
    const lanes = derivePipelineLanes({
      documentByCategory: {},
      issueTotal: 0,
      repositories: [],
      executionTotal: 0,
      executionRunStatuses: [],
      acceptanceTotal: 0,
      releases: [],
    });

    for (const lane of lanes) {
      expect(lane.count).toBe(0);
      expect(lane.count).not.toBeNull();
    }
  });

  it('无阻塞口径的站必须解释原因，且 blocked 为 null 而非 0', () => {
    const lanes = derivePipelineLanes({});

    for (const to of ['/app/intake', '/app/issues', '/app/repositories', '/app/acceptance']) {
      const lane = laneOf(lanes, to);
      expect(lane.blocked).toBeNull();
      expect(lane.blocked).not.toBe(0);
      expect(lane.blockedNote).toBeTruthy();
    }
  });
});

describe('derivePipelineLanes 逐站口径', () => {
  it('01 需求承接 = requirement + analysis 两类之和，其他分类不混入', () => {
    const lanes = derivePipelineLanes({
      documentByCategory: { requirement: 7, analysis: 3, design: 99, retro: 42 },
    });

    expect(laneOf(lanes, '/app/intake').count).toBe(10);
  });

  it('02 任务 = meta.total 原样透传', () => {
    expect(laneOf(derivePipelineLanes({ issueTotal: 128 }), '/app/issues').count).toBe(128);
  });

  it('03 仓库 = 无分页数组长度（等价全量）', () => {
    const lanes = derivePipelineLanes({ repositories: [{}, {}, {}] });
    expect(laneOf(lanes, '/app/repositories').count).toBe(3);
  });

  it('05 质量验收 = meta.total 原样透传（不是当前页长度）', () => {
    expect(laneOf(derivePipelineLanes({ acceptanceTotal: 55 }), '/app/acceptance').count).toBe(55);
  });

  it('04 执行记录：窗口覆盖全部时阻塞数是全量，不给窗口标注', () => {
    const lanes = derivePipelineLanes({
      executionTotal: 3,
      executionRunStatuses: ['completed', 'blocked', 'failed'],
    });
    const lane = laneOf(lanes, '/app/executions');

    expect(lane.count).toBe(3);
    expect(lane.blocked).toBe(1);
    expect(lane.blockedScopeNote).toBeUndefined();
  });

  it('04 执行记录：窗口未覆盖全部时阻塞数**必须标注**为窗口内，不冒充全量', () => {
    const lanes = derivePipelineLanes({
      executionTotal: 500,
      executionRunStatuses: ['blocked', 'blocked', 'completed'],
    });
    const lane = laneOf(lanes, '/app/executions');

    expect(lane.count).toBe(500);
    expect(lane.blocked).toBe(2);
    expect(lane.blockedScopeNote).toContain('3/500');
  });

  it('06 发版交付：只把 gateResult.passed === false 计为阻塞，未过门禁的不算失败', () => {
    const lanes = derivePipelineLanes({
      releases: [
        { gateResult: { passed: false } },
        { gateResult: { passed: true } },
        { gateResult: null }, // 尚未跑门禁 ≠ 门禁失败
        {}, // 从未跑过门禁
      ],
    });
    const lane = laneOf(lanes, '/app/releases');

    expect(lane.count).toBe(4);
    expect(lane.blocked).toBe(1);
    expect(lane.blockedNote).toBeUndefined();
  });
});
