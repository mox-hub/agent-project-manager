/**
 * 派发上下文富化的 token 预算器（P2-23 最小可用）。
 *
 * 粗估口径：token ≈ 字符数 / 4（中英混排的经验近似，不引 tokenizer 依赖）。
 * 职责单一：给定若干带优先级的来源段与总预算，贪心装入——
 * 预算内全保；装不下完整段时截断到剩余预算；预算耗尽丢弃。
 * 被截断/丢弃的来源一律在结果里如实标注（truncated），绝不静默。
 *
 * 纯函数、无 IO：context-builder（三来源富化）与 cli-dispatch（技能段注入）
 * 共用同一套预算口径，规则不复制。
 */

/** 缺省预算：enrichment 三来源段合计（token 粗估） */
export const DEFAULT_CONTEXT_ENRICHMENT_BUDGET_TOKENS = 4000;

/** 缺省预算：派发 prompt 的项目技能段（token 粗估） */
export const DEFAULT_DISPATCH_SKILLS_BUDGET_TOKENS = 2000;

/** 单技能内容摘要的最大字符数（防止单个巨型技能独占预算） */
export const DEFAULT_SKILL_CONTENT_MAX_CHARS = 1200;

/** 从环境变量读预算（缺省回退；非法/非正值回退），与 context.service 的 readThresholdFromEnv 同口径 */
export function readBudgetFromEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** token 粗估：字符数 / 4 向上取整 */
export function estimateTokens(text: string): number {
  return Math.ceil((text ?? '').length / 4);
}

/** 一个待装入的来源段（priority 小者先保；text 为空的段在入口即被滤掉） */
export interface EnrichmentSource {
  /** 来源标识（'docs' | 'memories' | 'lessons' | ...），truncated 标注用 */
  key: string;
  /** 段标题（markdown 标题行，如 '## 项目记忆'） */
  title: string;
  /** 段正文（不含标题行） */
  text: string;
  /** 装入优先级：1 最高，数字越大越先被截断/丢弃 */
  priority: number;
}

export interface EnrichmentSectionResult {
  /** 拼装完成的完整 markdown 段（各来源标题+正文，截断标注附在对应来源尾部）；全空为 '' */
  text: string;
  /** 装入的来源 key（按 priority 升序） */
  included: string[];
  /** 被截断或因预算耗尽被丢弃的来源 key（附原因后缀的展示用列表见 text 内标注） */
  truncated: string[];
  /** 本次生效的预算（token 粗估） */
  budgetTokens: number;
  /** 各来源实际占用的 token 粗估 */
  usedTokens: number;
}

/**
 * 贪心装入：按 priority 升序（同优先级按传入顺序）逐段装入总预算 budgetTokens。
 * - 整段装得下 → 原样装入；
 * - 装不下但剩余预算 ≥ 标题行 + 1 token → 截断正文到剩余预算，标 truncated；
 * - 剩余预算耗尽 → 丢弃，标 truncated。
 */
export function buildEnrichmentSection(
  sources: EnrichmentSource[],
  budgetTokens: number,
): EnrichmentSectionResult {
  const result: EnrichmentSectionResult = {
    text: '',
    included: [],
    truncated: [],
    budgetTokens,
    usedTokens: 0,
  };

  const ordered = [...sources]
    .filter((s) => s.text && s.text.trim())
    .sort((a, b) => a.priority - b.priority);

  const blocks: string[] = [];
  let remaining = budgetTokens;

  for (const source of ordered) {
    const titleLine = source.title;
    const titleTokens = estimateTokens(titleLine + '\n');
    const fullText = `${titleLine}\n${source.text}`;
    const fullTokens = estimateTokens(fullText);

    if (fullTokens <= remaining) {
      blocks.push(fullText);
      remaining -= fullTokens;
      result.usedTokens += fullTokens;
      result.included.push(source.key);
      continue;
    }

    // 截断分支：预算尚可容纳标题 + 至少一点正文才截断，否则丢弃
    const bodyBudgetTokens = remaining - titleTokens;
    if (bodyBudgetTokens >= 1) {
      // 按剩余 token 反推可保留的字符数（4 字符 ≈ 1 token），留 1 token 余量给截断标注
      const maxChars = Math.max(0, bodyBudgetTokens * 4 - 4);
      const truncatedBody =
        maxChars > 0 ? `${source.text.slice(0, maxChars)}…` : '';
      const truncatedNote = `（注：${source.title.replace(/^#+\s*/, '')}已按 token 预算截断）`;
      const block = truncatedBody
        ? `${titleLine}\n${truncatedBody}\n${truncatedNote}`
        : `${titleLine}\n${truncatedNote}`;
      const blockTokens = estimateTokens(block);
      blocks.push(block);
      remaining -= blockTokens;
      result.usedTokens += blockTokens;
      result.included.push(source.key);
      result.truncated.push(source.key);
    } else {
      result.truncated.push(source.key);
    }
  }

  result.text = blocks.join('\n\n');
  return result;
}
