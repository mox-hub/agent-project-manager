import { describe, expect, it } from 'vitest';
import { PIPELINE_STAGES } from '@/shared/layout/pipeline-stages';
import { SCREENPLAY_FORMAT_VERSION, parseScreenplay } from './screenplay-format';

/**
 * 剧本是**唯一不被服务端校验的数据**（不过 DTO、不过 zod、不过 openapi）。
 * 故这里的用例都是"写错剧本会怎么表现"，而不是"正确剧本能解析"——后者只需一条。
 */

/** 一帧的最小合法形态：六站键取自唯一定义源，测试里不手抄路由 */
const laneKeys = () => Object.fromEntries(PIPELINE_STAGES.map((s) => [s.to, { count: 0, blocked: null }]));

const validFrame = (over: Record<string, unknown> = {}) => ({
  atMs: 0,
  stageNumber: '01',
  title: '一句话需求',
  narration: { headline: '刚收到一条需求' },
  lanes: laneKeys(),
  colleagues: [],
  events: [],
  decisions: [],
  ...over,
});

const validScreenplay = (over: Record<string, unknown> = {}) => ({
  formatVersion: SCREENPLAY_FORMAT_VERSION,
  id: 'demo',
  title: '演示',
  about: '这是一段回放',
  project: { id: 'p1', name: '示例项目' },
  storyAt: '2026-09-10T09:00:00.000Z',
  frames: [validFrame()],
  ...over,
});

describe('parseScreenplay · 整份拒绝', () => {
  it('合法剧本零丢弃，字段原样带出', () => {
    const { screenplay, drops } = parseScreenplay(validScreenplay());
    expect(drops).toEqual([]);
    expect(screenplay?.id).toBe('demo');
    expect(screenplay?.frames).toHaveLength(1);
  });

  it('★ 版本号不等即整份拒绝——不做"尽力解析"', () => {
    // 尽力解析的结果是"用旧剧本演示一个已经不存在的数据口径"，比打不开更坏
    const { screenplay, drops } = parseScreenplay(validScreenplay({ formatVersion: 999 }));
    expect(screenplay).toBeNull();
    expect(drops[0].why).toMatch(/格式版本不匹配/);
  });

  it.each([['id'], ['title'], ['about']])('%s 缺失即拒绝（这三种缺了没法标注这是什么）', (key) => {
    const { screenplay, drops } = parseScreenplay(validScreenplay({ [key]: '' }));
    expect(screenplay).toBeNull();
    expect(drops[0].why).toMatch(new RegExp(key));
  });

  it('project.id 缺失即拒绝', () => {
    const { screenplay } = parseScreenplay(validScreenplay({ project: { name: 'x' } }));
    expect(screenplay).toBeNull();
  });

  it('storyAt 缺失或不可解析即拒绝（否则帧内时刻没有真实依据）', () => {
    expect(parseScreenplay(validScreenplay({ storyAt: '不是日期' })).screenplay).toBeNull();
    expect(parseScreenplay(validScreenplay({ storyAt: undefined })).screenplay).toBeNull();
  });

  it('frames 为空即拒绝', () => {
    const { screenplay, drops } = parseScreenplay(validScreenplay({ frames: [] }));
    expect(screenplay).toBeNull();
    expect(drops[0].why).toMatch(/frames 为空/);
  });

  it('根不是对象即拒绝', () => {
    expect(parseScreenplay(null).screenplay).toBeNull();
    expect(parseScreenplay('剧本').screenplay).toBeNull();
  });
});

describe('parseScreenplay · 丢帧', () => {
  it('atMs 不是有限数 → 丢该帧（回放时间无来源）', () => {
    const { screenplay, drops } = parseScreenplay(
      validScreenplay({ frames: [validFrame({ atMs: Number.NaN }), validFrame({ atMs: 100 })] }),
    );
    expect(screenplay?.frames).toHaveLength(1);
    expect(drops[0]).toEqual({ where: 'frames[0]', why: expect.stringMatching(/atMs/) });
  });

  it('缺 stageNumber / title / narration.headline → 丢该帧', () => {
    expect(parseScreenplay(validScreenplay({ frames: [validFrame({ stageNumber: '' })] })).screenplay).toBeNull();
    expect(parseScreenplay(validScreenplay({ frames: [validFrame({ title: '' })] })).screenplay).toBeNull();
    expect(
      parseScreenplay(validScreenplay({ frames: [validFrame({ narration: {} })] })).screenplay,
    ).toBeNull();
  });

  it.each([['colleagues'], ['events'], ['decisions']])('%s 不是数组 → 丢该帧', (field) => {
    const { screenplay, drops } = parseScreenplay(
      validScreenplay({ frames: [validFrame({ [field]: '不是数组' }), validFrame({ atMs: 10 })] }),
    );
    expect(screenplay?.frames).toHaveLength(1);
    expect(drops[0].why).toMatch(new RegExp(field));
  });

  it('★ lanes 缺站 → 丢该帧，并把缺哪几站报出来', () => {
    // 快照语义下"未提及"≠"没变化"：放过去会让一个漏写的站静默沿用上一帧的数字，
    // 看起来像"这条管道停在那儿没动"——一个精确、具体、且完全错误的读数
    const partial = laneKeys();
    delete partial['/app/acceptance'];
    const { screenplay, drops } = parseScreenplay(
      validScreenplay({ frames: [validFrame({ lanes: partial }), validFrame({ atMs: 10 })] }),
    );
    expect(screenplay?.frames).toHaveLength(1);
    expect(drops[0].why).toMatch(/缺 05/);
  });

  it('lanes 值可以是 null（该帧无口径），但键必须齐', () => {
    const empty = Object.fromEntries(PIPELINE_STAGES.map((s) => [s.to, { count: null, blocked: null }]));
    const { screenplay, drops } = parseScreenplay(validScreenplay({ frames: [validFrame({ lanes: empty })] }));
    expect(drops).toEqual([]);
    expect(screenplay?.frames[0].lanes['/app/issues']).toEqual({ count: null, blocked: null });
  });

  it('★ 部分帧坏掉仍可播：丢的是那一帧，不是整场演示', () => {
    const { screenplay, drops } = parseScreenplay(
      validScreenplay({
        frames: [validFrame({ atMs: 0 }), { 坏帧: true }, validFrame({ atMs: 20 })],
      }),
    );
    expect(screenplay?.frames.map((f) => f.atMs)).toEqual([0, 20]);
    expect(drops).toHaveLength(1);
  });

  it('全部帧都坏 → 退回"无一帧可用"，不返回一个空剧本', () => {
    const { screenplay, drops } = parseScreenplay(validScreenplay({ frames: ['x', 'y'] }));
    expect(screenplay).toBeNull();
    expect(drops.map((d) => d.why)).toContain('无一帧可用');
  });
});

describe('parseScreenplay · 排序', () => {
  it('★ 帧按 atMs 单调排序：乱序剧本会让步进往回退、跳站跳到更早的一帧', () => {
    const { screenplay } = parseScreenplay(
      validScreenplay({
        frames: [validFrame({ atMs: 30, title: 'c' }), validFrame({ atMs: 10, title: 'a' }), validFrame({ atMs: 20, title: 'b' })],
      }),
    );
    expect(screenplay?.frames.map((f) => f.title)).toEqual(['a', 'b', 'c']);
  });

  it('排序不改动入参数组（纯函数不留副作用）', () => {
    const input = validScreenplay({
      frames: [validFrame({ atMs: 30 }), validFrame({ atMs: 10 })],
    });
    parseScreenplay(input);
    expect((input.frames as { atMs: number }[]).map((f) => f.atMs)).toEqual([30, 10]);
  });
});
