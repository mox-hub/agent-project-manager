import type { SurfaceSnapshot } from './surface-snapshot';

/**
 * 叙述层解析与确定性降级（ARCH-AISURFACE-001 §3.3）。
 *
 * 本文件不碰 React，只做两件可单测的事：
 *
 * 1. **解析模型输出**（`parseSurfaceNarration`）——容错，且带一道**防幻觉闸门**：
 *    `needsYou[].decisionId` 必须真的在快照的待办清单里。模型编一个 id 出来，
 *    用户点下去会打开**另一张**卡——"AI 说错了"里最贵的一种错。
 * 2. **确定性模板**（`buildTemplateNarration`）——模型不可用/超时/输出不成形时的兜底。
 *    它只从快照取词造句，**一个数都不新算**，因此降级态与 AI 态在事实上同源。
 *
 * 两条纪律：解析失败**不**抛错（返回 null，由调用方决定降级）；模板**不**委婉——
 * 降级就是降级，UI 必须标注「规则生成的摘要」，不能让人以为这是 AI 的判断。
 */

export interface SurfaceNarrationBlocker {
  what: string;
  who?: string;
  since?: string;
  why?: string;
  whatYouCanDo?: string;
}

export interface SurfaceNarrationNeedsYou {
  decisionId: string;
  oneLineWhy?: string;
  urgency?: string;
}

export interface SurfaceNarration {
  headline: string;
  highlights: string[];
  blockers: SurfaceNarrationBlocker[];
  needsYou: SurfaceNarrationNeedsYou[];
  honestGaps: string[];
  /** `ai` = 模型生成；`template` = 规则生成（降级），UI 必须据此标注 */
  source: 'ai' | 'template';
}

/** 非空字符串，否则 undefined（把 `""` 当缺失，不给空串占位） */
function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

/** 字符串数组：逐项过滤空值，并限长 */
function strList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => str(item))
    .filter((item): item is string => item !== undefined)
    .slice(0, max);
}

function objList(value: unknown, max: number): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === 'object' && !Array.isArray(item),
    )
    .slice(0, max);
}

/**
 * 解析 `surface-narration` 的 data。headline 缺失即视为不成形，返回 null
 * （调用方据此降级到模板）——一句话总述是这块面板的**主体**，没有它，
 * 剩下的 highlights/gaps 拼不出通顺的东西，与其半显示不如老实降级。
 */
export function parseSurfaceNarration(
  data: Record<string, unknown> | undefined,
  snapshot: SurfaceSnapshot,
): SurfaceNarration | null {
  const headline = str(data?.headline);
  if (!headline) return null;

  // 防幻觉闸门：模型给的 decisionId 必须真的在快照里，否则整条丢弃。
  // 不能"尽量用"——一个不存在的 id 会让用户点开错误的决策卡。
  const knownIds = new Set(
    (snapshot.needsYou?.top ?? []).map((item) => item.id),
  );
  const needsYou: SurfaceNarrationNeedsYou[] = objList(data?.needsYou, 5)
    .map((item) => ({
      decisionId: str(item.decisionId) ?? '',
      oneLineWhy: str(item.oneLineWhy),
      urgency: str(item.urgency),
    }))
    .filter((item) => item.decisionId !== '' && knownIds.has(item.decisionId));

  const blockers: SurfaceNarrationBlocker[] = objList(data?.blockers, 5)
    .map((item) => ({
      what: str(item.what) ?? '',
      who: str(item.who),
      since: str(item.since),
      why: str(item.why),
      whatYouCanDo: str(item.whatYouCanDo),
    }))
    // 没有 what 的阻塞项读者看不懂，丢弃
    .filter((item) => item.what !== '');

  return {
    headline,
    highlights: strList(data?.highlights, 3),
    blockers,
    needsYou,
    honestGaps: strList(data?.honestGaps, 3),
    source: 'ai',
  };
}

/**
 * 确定性模板叙述：只从快照取词造句，**一个数都不新算**。
 *
 * 它的价值不在好看，在于「模型挂了盯盘也不白屏」（§3.3 约束③）——
 * 而且因为它和 AI 态用的是同一份事实快照，降级不会带来事实口径的第二套说法。
 */
export function buildTemplateNarration(
  snapshot: SurfaceSnapshot,
): SurfaceNarration {
  const parts: string[] = [];

  if (snapshot.colleagues) {
    const { total, working, needYou, other } = snapshot.colleagues;
    if (total === 0) {
      parts.push('现在没有 AI 同事在岗');
    } else if (working === 0 && needYou === 0) {
      parts.push(`${total} 位 AI 同事都闲着`);
    } else {
      const segments: string[] = [];
      if (working > 0) segments.push(`${working} 位在干活`);
      if (needYou > 0) segments.push(`${needYou} 位在等你`);
      // 不认识的档位照实说，不折算成"在干活"
      if (other > 0) segments.push(`${other} 位状态未识别`);
      parts.push(`${total} 位 AI 同事里，${segments.join('、')}`);
    }
  } else {
    parts.push('同事状态还没取到');
  }

  if (snapshot.needsYou) {
    parts.push(
      snapshot.needsYou.total > 0
        ? `有 ${snapshot.needsYou.total} 件事等你拍板`
        : '暂时没有等你拍板的事',
    );
  } else {
    parts.push('待办清单还没取到');
  }

  const blockers: SurfaceNarrationBlocker[] = snapshot.roster
    .filter((entry) => entry.blocking > 0)
    .slice(0, 5)
    .map((entry) => ({
      what: `${entry.name} 手上有 ${entry.blocking} 项待决`,
      who: entry.name,
      // 用开跑时刻做**事实陈述**，不说成"卡了多久"（快照没有阻塞起始时刻）
      since: entry.runStartedAt
        ? `${entry.name} 这次执行从 ${entry.runStartedAt} 开始`
        : undefined,
    }));

  const needsYou: SurfaceNarrationNeedsYou[] = (snapshot.needsYou?.top ?? [])
    .slice(0, 5)
    .map((item) => ({
      decisionId: item.id,
      oneLineWhy: item.title,
      urgency: item.urgency,
    }));

  return {
    headline: `${parts.join('，')}。`,
    highlights: [],
    blockers,
    needsYou,
    honestGaps: snapshot.gaps.slice(0, 3),
    source: 'template',
  };
}
