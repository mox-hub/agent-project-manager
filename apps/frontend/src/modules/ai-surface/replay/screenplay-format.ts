import type { OfficeColleague } from '@/modules/office/api/office-api';
import type { Decision } from '@/shared/decision-card/types';
import { PIPELINE_STAGES } from '@/shared/layout/pipeline-stages';
import type { SurfaceNarration } from '../adapters/surface-narration';

/**
 * 回放剧本的**格式契约**（ARCH-AISURFACE-001 §3.4 路径 A / §五 S5）。
 *
 * ## 为什么这是一个"契约"而不是一个类型
 *
 * 设计纪要原文：「数据来源：`seed.ts` 既有示例项目 + 一份快照 JSON（**快照格式即契约，
 * 需登记**）」。之所以要按契约对待：剧本是**唯一不被服务端校验的数据**——它不经过
 * DTO、不经过 zod、不经过 openapi，写错了没有任何一层会拦住。故此处把校验显式做出来
 * （`parseScreenplay`），并把版本号写进格式里：将来格式一改，旧剧本**整份拒绝**
 * 而不是"尽力而为地猜"（猜出来的剧本会静默演示一个不存在的产品）。
 *
 * ## 格式的两条硬约束
 *
 * 1. **帧内字段一律复用既有口径，不另起一套**。`colleagues` 是 `OfficeColleague`
 *    （office 服务同型）、`decisions` 是 `Decision`（决策收件箱同型）、`events` 是
 *    **原始领域事件**（回放时经**同一个** `normalizeSurfaceEvent` 归一化）。因此回放
 *    与实况走的是同一条投影与渲染链——演示里看到的卡，就是真实项目里会看到的那张卡。
 * 2. **每帧是一份全量快照，不是增量**。「未提及」在增量语义下等于"没变化"，而在快照
 *    语义下等于"不该缺失"——两者混淆时，一个漏写的站会**静默沿用上一帧的数字**，
 *    看起来像"这条管道停在那儿没动"。故每帧必须给全六站（值可为 `null` 表示该帧无口径，
 *    但**键必须齐**），缺键即整帧丢弃并把原因报出来。
 *
 * ## 数据以 TS 模块承载
 *
 * 设计纪要写的是「一份快照 JSON」。此处用 `.ts` 模块承载**等价的结构化数据**（而非
 * `.json` 文件），换取两样东西：编译期类型校验（格式契约的第一道门）与可组合的
 * 构造辅助函数（同一份同事档案在多帧之间复用）。数据结构本身仍是纯 JSON 可序列化的
 * ——若要外置成 `.json` 由运行时 fetch，`parseScreenplay` 原样可用。
 */

/** 格式版本。**不向后兼容**：版本不等即整份拒绝，不做"尽力解析"。 */
export const SCREENPLAY_FORMAT_VERSION = 1;

/**
 * 回放态下每格数字的溯源标签。
 *
 * 剧本帧里的计数**不是**从任何端点取的，若沿用实况的 `source`（如「GET /documents/stats」）
 * 就等于让悬停提示说一句假话——而这正是本页反复在治的那类错误。故回放态一律改标此值。
 */
export const REPLAY_SOURCE_LABEL = '回放剧本（预置快照，非实时取数）';

/** 单站某时刻的事实。`null` = 该帧对此站没有口径（**不是 0**） */
export interface ScreenplayLaneFacts {
  count: number | null;
  blocked: number | null;
  /** `blocked` 为 null 时必须说明为什么；为窗口内计数时说明范围 */
  blockedNote?: string;
  blockedScopeNote?: string;
}

/**
 * 一帧 = 某个时刻的**面级事实全量**。
 *
 * 帧里没有任何"时长""剩余时间""进度百分比"字段：剧本是**已发生事实的复述**，
 * 不是一份规划。演示要能讲清"这一步花了多久"，只能由 `atMs` 与相邻帧的差值推出来——
 * 那是观众自己能算的，不需要我们再编一个数。
 */
export interface ScreenplayFrame {
  /** 相对剧本起点的毫秒偏移——**回放时间的唯一来源** */
  atMs: number;
  /** 本帧归属哪一站（`PIPELINE_STAGES` 的 `stageNumber`），"跳站"据此定位 */
  stageNumber: string;
  /** 这一步发生了什么（人话，给小白看） */
  title: string;
  /** 该时刻顶栏那句话 */
  narration: SurfaceNarration;
  /** 六站计数：键 = `PIPELINE_STAGES` 的 `to`，必须齐 */
  lanes: Record<string, ScreenplayLaneFacts>;
  /** 该时刻的同事工位（office 口径同型，直接喂 `toStationCards`） */
  colleagues: OfficeColleague[];
  /** 该时刻投影层里的事件（**原始**领域事件，回放时走同一个归一化器） */
  events: ScreenplayEvent[];
  /** 该时刻的待办（决策收件箱口径同型） */
  decisions: Decision[];
}

/** 剧本里的原始领域事件：`atMs` 是相对剧本起点的偏移 */
export interface ScreenplayEvent {
  eventName: string;
  payload: Record<string, unknown>;
  atMs: number;
}

export interface Screenplay {
  formatVersion: number;
  id: string;
  title: string;
  /** 一句话说明这是什么（必须写明"回放"，不能让人误当实时） */
  about: string;
  /** 剧本对应的既有示例项目（seed 同一口径，仅作展示与溯源） */
  project: { id: string; name: string };
  /**
   * 「故事发生的时间」——剧本起点的绝对时刻（ISO 8601）。
   *
   * 帧内的 `atMs` 只是偏移，事件落到投影层时需要一个真实时刻戳。若用
   * `Date.now()` 兜底，同一份剧本两次回放会显示**两个不同的时间**，而演示里
   * 那些"14:20 开始跑"的读数看起来又很精确——精确的假时间比明显的占位更坏。
   * 故剧本自带一个固定起点，回放每次都得到同一组时刻（顺带让测试可确定性断言）。
   */
  storyAt: string;
  frames: ScreenplayFrame[];
}

/** 一条被丢弃的帧/条目及原因——**丢弃必须可见**，不静默（沿用投影层纪律） */
export interface ScreenplayDrop {
  where: string;
  why: string;
}

export interface ParseScreenplayResult {
  screenplay: Screenplay | null;
  drops: ScreenplayDrop[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 校验一份剧本。**返回丢弃清单而不是抛异常**：抛异常会让"第三帧写错了"变成
 * "整场演示打不开"，而丢弃清单既能继续放、又能把问题精确指出来。
 *
 * 三条判据：
 * 1. 版本号必须精确相等（不等即整份拒绝，`drops` 记一条）；
 * 2. 帧的信封字段必须齐全且类型正确，否则丢该帧；
 * 3. 帧的 `lanes` 必须给全六站（`PIPELINE_STAGES` 逐一比对）——缺站即丢该帧。
 *    值本身可以是 `null`（无口径），但**键不能缺**（见文件头约束 2）。
 */
export function parseScreenplay(value: unknown): ParseScreenplayResult {
  const drops: ScreenplayDrop[] = [];

  if (!isRecord(value)) {
    return { screenplay: null, drops: [{ where: 'root', why: '不是对象' }] };
  }
  if (value.formatVersion !== SCREENPLAY_FORMAT_VERSION) {
    return {
      screenplay: null,
      drops: [
        {
          where: 'root',
          why: `格式版本不匹配（期望 ${SCREENPLAY_FORMAT_VERSION}，实际 ${String(value.formatVersion)}）——不做尽力解析`,
        },
      ],
    };
  }
  for (const key of ['id', 'title', 'about'] as const) {
    if (typeof value[key] !== 'string' || value[key].length === 0) {
      return { screenplay: null, drops: [{ where: 'root', why: `${key} 缺失或为空` }] };
    }
  }
  if (!isRecord(value.project) || typeof value.project.id !== 'string') {
    return { screenplay: null, drops: [{ where: 'root', why: 'project.id 缺失' }] };
  }
  if (typeof value.storyAt !== 'string' || Number.isNaN(Date.parse(value.storyAt))) {
    return { screenplay: null, drops: [{ where: 'root', why: 'storyAt 缺失或不可解析' }] };
  }
  if (!Array.isArray(value.frames) || value.frames.length === 0) {
    return { screenplay: null, drops: [{ where: 'root', why: 'frames 为空' }] };
  }

  const frames: ScreenplayFrame[] = [];
  value.frames.forEach((raw, i) => {
    const where = `frames[${i}]`;
    if (!isRecord(raw)) {
      drops.push({ where, why: '不是对象' });
      return;
    }
    if (typeof raw.atMs !== 'number' || !Number.isFinite(raw.atMs)) {
      drops.push({ where, why: 'atMs 不是有限数（回放时间无来源）' });
      return;
    }
    if (typeof raw.stageNumber !== 'string' || raw.stageNumber.length === 0) {
      drops.push({ where, why: 'stageNumber 缺失（无法定位跳站目标）' });
      return;
    }
    if (typeof raw.title !== 'string' || raw.title.length === 0) {
      drops.push({ where, why: 'title 缺失（这一步讲不清）' });
      return;
    }
    if (!isRecord(raw.narration) || typeof raw.narration.headline !== 'string') {
      drops.push({ where, why: 'narration.headline 缺失' });
      return;
    }
    if (!isRecord(raw.lanes)) {
      drops.push({ where, why: 'lanes 缺失' });
      return;
    }
    const missing = PIPELINE_STAGES.filter((s) => !(s.to in (raw.lanes as object))).map(
      (s) => s.stageNumber,
    );
    if (missing.length > 0) {
      // 快照语义下"未提及"不等于"没变化"——静默沿用上一帧会让一条停摆的管道看起来在动
      drops.push({ where, why: `lanes 未给全六站，缺 ${missing.join('/')}` });
      return;
    }
    for (const field of ['colleagues', 'events', 'decisions'] as const) {
      if (!Array.isArray(raw[field])) {
        drops.push({ where, why: `${field} 不是数组` });
        return;
      }
    }

    frames.push({
      atMs: raw.atMs,
      stageNumber: raw.stageNumber,
      title: raw.title,
      narration: raw.narration as unknown as SurfaceNarration,
      lanes: raw.lanes as unknown as Record<string, ScreenplayLaneFacts>,
      colleagues: raw.colleagues as OfficeColleague[],
      events: raw.events as ScreenplayEvent[],
      decisions: raw.decisions as Decision[],
    });
  });

  if (frames.length === 0) {
    return { screenplay: null, drops: [...drops, { where: 'frames', why: '无一帧可用' }] };
  }

  return {
    screenplay: {
      formatVersion: SCREENPLAY_FORMAT_VERSION,
      id: value.id as string,
      title: value.title as string,
      about: value.about as string,
      project: value.project as { id: string; name: string },
      storyAt: value.storyAt as string,
      // 时间轴必须单调——乱序剧本会让"步进"往回退、"跳站"跳到更早的一帧
      frames: [...frames].sort((a, b) => a.atMs - b.atMs),
    },
    drops,
  };
}
