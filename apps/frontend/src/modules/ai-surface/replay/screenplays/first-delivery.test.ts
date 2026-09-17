import { describe, expect, it } from 'vitest';
import { PIPELINE_STAGES } from '@/shared/layout/pipeline-stages';
import { parseScreenplay } from '../screenplay-format';
import { buildFrameFacts } from '../screenplay-facts';
import { FIRST_DELIVERY_SCREENPLAY } from './first-delivery';

/**
 * 剧本数据的守卫（**不是**解析器的守卫——解析器由 `screenplay-format.test.ts` 管）。
 *
 * 这里的每一条都在防同一个失效模式：**演示里少了一幕，但看起来像是本来就没有那一幕**。
 * 剧本是静态数据，写错了没有任何一层会拦住（不过 DTO、不过 zod），故用测试代替那一层。
 */

const parsed = parseScreenplay(FIRST_DELIVERY_SCREENPLAY);
const frames = parsed.screenplay?.frames ?? [];
const storyAtMs = Date.parse(FIRST_DELIVERY_SCREENPLAY.storyAt);

describe('first-delivery 剧本 · 格式', () => {
  it('★ 自带剧本零丢弃——解析器一改格式，这里先红', () => {
    expect(parsed.screenplay).not.toBeNull();
    expect(parsed.drops).toEqual([]);
  });

  it('六站都有帧覆盖：这是一条"从一句话到交付"的完整链路，不能缺站', () => {
    const covered = new Set(frames.map((f) => f.stageNumber));
    for (const stage of PIPELINE_STAGES) {
      expect(covered, `站 ${stage.stageNumber} 在剧本里没有任何一帧`).toContain(stage.stageNumber);
    }
  });

  it('首帧是第 01 站、末帧是第 06 站（开头结尾都落在链路端点上）', () => {
    expect(frames[0].stageNumber).toBe(PIPELINE_STAGES[0].stageNumber);
    expect(frames[frames.length - 1].stageNumber).toBe(
      PIPELINE_STAGES[PIPELINE_STAGES.length - 1].stageNumber,
    );
  });

  it('时间轴单调递增且首帧为 0（步进/跳站都靠它）', () => {
    expect(frames[0].atMs).toBe(0);
    const at = frames.map((f) => f.atMs);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('每帧都写明了「为什么需要你」（needsYou 可为空数组，不可缺）', () => {
    for (const f of frames) {
      expect(Array.isArray(f.narration.needsYou), `${f.title} 缺 needsYou`).toBe(true);
    }
  });
});

describe('first-delivery 剧本 · 投影', () => {
  it('★ 全片没有任何一条事件被投影层丢弃——事件名写错就是"这一帧凭空少一条进展"', () => {
    for (const f of frames) {
      const facts = buildFrameFacts(f, storyAtMs);
      expect(facts.droppedEvents, `帧「${f.title}」的事件名不被识别`).toEqual([]);
    }
  });

  it('★ 全片没有任何一格数字来自实况端点名（溯源一律回放剧本）', () => {
    for (const f of frames) {
      for (const lane of buildFrameFacts(f, storyAtMs).lanes) {
        expect(lane.source).not.toMatch(/^GET |^POST /);
      }
    }
  });

  it('同事档案是可渲染的（工位卡不会因为缺字段而空白）', () => {
    const facts = buildFrameFacts(frames[0], storyAtMs);
    expect(facts.stations.length).toBeGreaterThan(0);
    for (const s of facts.stations) {
      expect(s.memberId).toBeTruthy();
      expect(s.displayName).toBeTruthy();
    }
  });
});

describe('first-delivery 剧本 · 要讲的那几件事', () => {
  it('★ 有一帧刻意降级（source=template）：演示"AI 挂了盯盘也不白屏"这条承诺', () => {
    const degraded = frames.filter((f) => f.narration.source === 'template');
    expect(degraded).toHaveLength(1);
    // 降级帧必须自己说清这是规则拼的，否则观众会把它当成 AI 的判断
    expect(degraded[0].narration.headline).toMatch(/规则/);
  });

  it('★ 降级帧里的待办仍在队列中——读盘失败不该让待办消失', () => {
    const degraded = frames.find((f) => f.narration.source === 'template');
    const facts = buildFrameFacts(degraded!, storyAtMs);
    expect(facts.queue.items.length).toBeGreaterThan(0);
    expect(facts.queue.items[0].urgency).toBe('blocking');
  });

  it('全片恰好有一次"轮到你"：人类只做点头这一个动作', () => {
    const framesNeedingYou = frames.filter((f) => f.narration.needsYou.length > 0);
    // 从待验收到通过之间的几帧都指着同一条待办，但剧本里只有一条待办
    const decisionIds = new Set(framesNeedingYou.flatMap((f) => f.narration.needsYou.map((n) => n.decisionId)));
    expect(decisionIds.size).toBe(1);
  });

  it('末帧挑明这是回放，不让人把预置剧本当成现场跑出来的', () => {
    const last = frames[frames.length - 1];
    expect(last.narration.honestGaps.join('')).toMatch(/回放/);
  });

  it('执行的 token 用量来自 runtime 终态事件（回放里的成本也是真字段，不是编的）', () => {
    const facts = buildFrameFacts(frames[frames.length - 1], storyAtMs);
    const result = facts.feed.find((i) => i.kind === 'result');
    // usage 挂在 detail 里（投影层的既有口径：有才带，绝不补 0 兜底）
    expect(result?.detail?.usage).toMatchObject({ totalTokens: 12_000, costUsd: 0.08 });
  });
});
