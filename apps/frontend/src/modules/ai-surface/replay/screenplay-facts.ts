import { PIPELINE_STAGES } from '@/shared/layout/pipeline-stages';
import { toStationCards, type StationCard } from '../adapters/office-to-station';
import {
  LANE_NO_BLOCKED_NOTE,
  type PipelineLane,
} from '../hooks/use-pipeline-lanes';
import { sortDecisionQueue, type DecisionQueue } from '../hooks/use-decision-queue';
import { normalizeSurfaceEvent, type SurfaceFeedItem } from '../hooks/use-surface-feed';
import { REPLAY_SOURCE_LABEL, type ScreenplayFrame } from './screenplay-format';

/**
 * 剧本帧 → 视图事实（**纯函数**，可单测）。
 *
 * ## 这一层的存在理由：一条渲染路径，两个数据源
 *
 * 回放与实况**喂给同一批组件**。故本模块的产出形状与实况侧一一对应：
 *
 * | 产出 | 实况侧的来源 | 回放侧的来源 |
 * |------|-------------|-------------|
 * | `stations: StationCard[]` | `useOfficeSummary` → `toStationCards` | 帧里的 `colleagues` → **同一个** `toStationCards` |
 * | `feed: SurfaceFeedItem[]` | WS 事件 → `normalizeSurfaceEvent` | 帧里的 `events` → **同一个** `normalizeSurfaceEvent` |
 * | `lanes: PipelineLane[]` | 各站端点 → `derivePipelineLanes` | 帧里的 `lanes` + **同一份** `PIPELINE_STAGES`/`LANE_NO_BLOCKED_NOTE` |
 * | `queue: DecisionQueue` | `usePendingDecisions` → `sortDecisionQueue` | 帧里的 `decisions` → **同一个** `sortDecisionQueue` |
 *
 * 唯一**必须**不同的是 `source` 溯源字段：帧里的数字不是从任何端点取的，若沿用实况的
 * 「GET /documents/stats」就是让悬停提示说假话（本页反复在治的那类错误），故一律改标
 * `REPLAY_SOURCE_LABEL`。这条"只改溯源、不改口径"是该层全部的自由度。
 */

export interface ScreenplayFrameFacts {
  stations: StationCard[];
  feed: SurfaceFeedItem[];
  lanes: PipelineLane[];
  queue: DecisionQueue;
  /**
   * 剧本里写了、但投影层不认识（归一化返回 null）的事件名。
   *
   * 不静默丢：剧本事件名写错了（比如把 `execution.completed` 写成 `execution.complete`）
   * 的表现是**这一帧的进展行凭空少一条**，看起来跟"这一步本来就没进展"一模一样。
   */
  droppedEvents: string[];
}

/**
 * @param frame 剧本帧
 * @param storyAtMs 剧本起点时刻（epoch ms）——帧内 `atMs` 是相对偏移，相加得到真实时刻戳
 */
export function buildFrameFacts(
  frame: ScreenplayFrame,
  storyAtMs: number,
): ScreenplayFrameFacts {
  const droppedEvents: string[] = [];
  const feed: SurfaceFeedItem[] = [];
  for (const event of frame.events) {
    const item = normalizeSurfaceEvent(
      event.eventName,
      event.payload,
      storyAtMs + event.atMs,
    );
    if (item) feed.push(item);
    else droppedEvents.push(event.eventName);
  }

  const items = sortDecisionQueue(frame.decisions);
  const queue: DecisionQueue = {
    items,
    // 剧本给的是全量（回放不存在分页），故 total 就是长度、hiddenCount 恒 0。
    // 不照搬 `hiddenCount = total - items.length` 那套：此处两者本就相等，
    // 写出来只是让读者以为这里有分页逻辑。
    total: items.length,
    blocking: items.filter((d) => d.urgency === 'blocking').length,
    advisory: items.filter((d) => d.urgency === 'advisory').length,
    hiddenCount: 0,
  };

  const lanes: PipelineLane[] = PIPELINE_STAGES.map((stage) => {
    const facts = frame.lanes[stage.to];
    return {
      stageNumber: stage.stageNumber,
      to: stage.to,
      label: stage.labelFallback,
      hint: stage.hintFallback,
      count: facts?.count ?? null,
      blocked: facts?.blocked ?? null,
      // 帧未给原因时取与实况同一份标准文案；帧给了就以帧为准（窗口内计数这类情形）
      blockedNote:
        facts?.blocked === null
          ? (facts.blockedNote ?? LANE_NO_BLOCKED_NOTE[stage.to] ?? '该站无阻塞计数口径')
          : undefined,
      blockedScopeNote: facts?.blockedScopeNote,
      source: REPLAY_SOURCE_LABEL,
    };
  });

  return {
    stations: toStationCards(frame.colleagues, feed),
    feed,
    lanes,
    queue,
    droppedEvents,
  };
}
