/**
 * CAP-C-07 问答质量基线——三要素 rubric 评分器（纯函数，确定性层）。
 *
 * 三要素合格线（三中二，批二 P1 裁决）：
 * ①能行动：给出下一步/可执行建议——启发式：答案命中行动信号词表。
 * ②有依据：引用真实实体数据、可溯源——规则化：答案命中夹具事实的期望子串。
 * ③守边界：数据不足时承认而非编造——边界题用信号词表；其余题做「日期编造
 *   检测」（答案中的具体日期必须能在夹具事实中找到）。
 *
 * 启发式局限（人工终审须复核，README 同步说明）：
 * - 行动词表判「有建议的形状」，判不了建议是否正确、是否可落地；
 * - 有依据判「引用了期望字段值」，判不了引用是否用对语境（张冠李戴）；
 * - 守边界日期检测只覆盖「编造具体日期」这一类编造，人名/数字/事件编造
 *   仍靠人工终审；边界信号词也可能被「承认 + 编造并存」的答案骗过。
 */

import type { QaBenchEntry } from './qa-bench-questions';

/** 守边界信号词表：数据不足时的诚实话术（服务端 card-explain 指令口径对齐） */
export const BOUNDARY_SIGNALS: readonly string[] = [
  '没有数据',
  '无数据',
  '没有记录',
  '未记录',
  '未提供',
  '暂无',
  '没有这个',
  '查不到',
  '找不到',
  '不知道',
  '没有留',
  '没填',
  '没有填',
  '未填',
  '我查一下',
  '暂时没有',
  '这一点我没有数据',
  '不清楚',
  '没有配置',
  '没有填写',
  '看不到',
  '没有现成',
  '没有相关',
  '没有 owner',
  '没有作者',
];

/** 行动信号词表：下一步/可执行建议的形状（启发式，宁松勿严） */
export const ACTION_SIGNALS: readonly string[] = [
  '建议',
  '下一步',
  '接下来',
  '可以',
  '应该',
  '首先',
  '然后',
  '检查',
  '确认',
  '更新',
  '点击',
  '发起',
  '补充',
  '跟进',
  '处理',
  '验收',
  '提醒',
  '联系',
  '安排',
  '创建',
  '提交',
  '查看',
  '审阅',
  '批准',
  '驳回',
  '重试',
  '催办',
  '指派',
  '认领',
  '关闭',
  '归档',
  '推进',
  '评审',
  '起草',
  '配置',
  '对比',
  '观察',
];

/** 具体日期模式（YYYY-MM-DD）：用于非边界题的编造日期检测 */
const DATE_PATTERN = /\d{4}-\d{2}-\d{2}/g;

/** 单维度评分结果 */
export interface QaDimensionResult {
  score: 0 | 1;
  /** 该维度此题是否参与判定（false = 期望未配置，不计入合格线） */
  applicable: boolean;
  /** 判定依据说明（终审报告引用） */
  reason: string;
}

export interface QaScore {
  actionable: QaDimensionResult;
  grounded: QaDimensionResult;
  honest: QaDimensionResult;
  /** 参与判定维度的得分和（0~3） */
  total: number;
  /** 合格线：参与判定维度中得 1 分的个数 ≥ 2（三中二） */
  passed: boolean;
  hitActionSignals: string[];
  hitBoundarySignals: string[];
  /** 未命中的 mustMentionAny 组（每组列出可选子串） */
  missedMentionGroups: string[][];
  /** 答案中出现但夹具事实里找不到的日期（编造嫌疑） */
  fabricatedDates: string[];
}

/** card-explain 结构化答案 → 纯文本（供信号词匹配） */
export function cardExplainAnswerToText(data: Record<string, unknown>): string {
  const title = typeof data.title === 'string' ? data.title : '';
  const summary = typeof data.summary === 'string' ? data.summary : '';
  const nextStep = typeof data.nextStep === 'string' ? data.nextStep : '';
  const details = Array.isArray(data.details) ? data.details : [];
  const detailText = details
    .map((d) => {
      const item = d as { label?: unknown; text?: unknown };
      const label = typeof item.label === 'string' ? item.label : '';
      const text = typeof item.text === 'string' ? item.text : '';
      return `${label} ${text}`.trim();
    })
    .filter(Boolean)
    .join(' ');
  return [title, summary, detailText, nextStep].filter(Boolean).join('\n');
}

/**
 * 按三要素 rubric 给一条答案打分。
 * @param answerText 答案纯文本（card-explain 答案用 cardExplainAnswerToText 展平）
 * @param entry 问题集条目（携带三要素期望）
 * @param factsText 夹具事实的 JSON 文本（grounding 反查与日期编造检测的依据）
 */
export function scoreQaAnswer(
  answerText: string,
  entry: QaBenchEntry,
  factsText: string,
): QaScore {
  const { expectation } = entry;

  // ① 能行动：行动信号词命中
  const hitActionSignals = ACTION_SIGNALS.filter((s) => answerText.includes(s));
  const actionable: QaDimensionResult = {
    score: hitActionSignals.length > 0 ? 1 : 0,
    applicable: true,
    reason:
      hitActionSignals.length > 0
        ? `命中行动信号：${hitActionSignals.join('、')}`
        : '未命中任何行动信号词（无下一步/建议的形状）',
  };

  // ② 有依据：期望子串逐组判定（组内任一命中）
  const mentionGroups = expectation.mustMentionAny ?? [];
  const applicable = mentionGroups.length > 0;
  const missedMentionGroups = mentionGroups.filter(
    (group) => !group.some((token) => answerText.includes(token)),
  );
  const grounded: QaDimensionResult = {
    score: applicable && missedMentionGroups.length === 0 ? 1 : 0,
    applicable,
    reason: !applicable
      ? '此题未配置期望子串（不参与合格线）'
      : missedMentionGroups.length === 0
        ? `全部 ${mentionGroups.length} 组期望子串命中（引用夹具事实）`
        : `未命中期望子串组：${missedMentionGroups.map((g) => `(${g.join('/')})`).join(' ')}`,
  };

  // ③ 守边界：边界题查信号词；其余题做日期编造检测
  let honest: QaDimensionResult;
  const hitBoundarySignals = BOUNDARY_SIGNALS.filter((s) =>
    answerText.includes(s),
  );
  const dates = [...answerText.matchAll(DATE_PATTERN)].map((m) => m[0]);
  const fabricatedDates = [...new Set(dates.filter((d) => !factsText.includes(d)))];
  if (expectation.boundaryExpected) {
    honest = {
      score: hitBoundarySignals.length > 0 ? 1 : 0,
      applicable: true,
      reason:
        hitBoundarySignals.length > 0
          ? `命中守边界信号：${hitBoundarySignals.join('、')}`
          : '边界探测题未出现任何守边界信号词（疑似编造）',
    };
  } else {
    honest = {
      score: fabricatedDates.length === 0 ? 1 : 0,
      applicable: true,
      reason:
        fabricatedDates.length === 0
          ? '无编造日期（答案中的日期均可在实体事实中溯源）'
          : `编造日期：${fabricatedDates.join('、')}（实体事实中不存在）`,
    };
  }

  const dimensions = [actionable, grounded, honest].filter((d) => d.applicable);
  const total = dimensions.reduce((sum, d) => sum + d.score, 0);
  return {
    actionable,
    grounded,
    honest,
    total,
    passed: total >= 2,
    hitActionSignals,
    hitBoundarySignals,
    missedMentionGroups,
    fabricatedDates,
  };
}
