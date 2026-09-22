import { useMutation } from '@tanstack/react-query';
import { assistantApi } from '@/modules/assistant/api/assistant-api';

/**
 * 拆解质量评估（CAP-P-01 五期切片 3）：读组合件任务族，AI 逐任务评估
 * 颗粒度与可测性、汇总覆盖度双向孤儿。批卡前的 advisory 信息层——
 * 由人手动触发（省 token），结果仅呈现，不拦截批卡动作。
 */

export interface DecompTaskFinding {
  index: number;
  granularity: 'ok' | 'too-big' | 'too-small';
  reason: string;
  suggestion: string;
  testability: 'ok' | 'weak';
}

export interface DecompCoverage {
  uncovered: string[];
  orphans: number[];
}

export interface DecompositionReviewResult {
  tasks: DecompTaskFinding[];
  coverage: DecompCoverage;
  verdict: 'healthy' | 'needs-review' | 'rework';
  summary: string;
}

const GRANULARITIES = ['ok', 'too-big', 'too-small'];
const TESTABILITIES = ['ok', 'weak'];
const VERDICTS = ['healthy', 'needs-review', 'rework'];

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function asInt(v: unknown): number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : -1;
}

/** 防御性收敛：granularity/testability/verdict 不合法时降级，index 非法行丢弃 */
export function parseDecompositionReview(
  data: Record<string, unknown>,
): DecompositionReviewResult | null {
  const rawTasks = Array.isArray(data.tasks) ? data.tasks : [];
  const tasks = rawTasks
    .map((item) => {
      const t = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {};
      const index = asInt(t.index);
      if (index < 0) return null;
      const granularity = GRANULARITIES.includes(t.granularity as never)
        ? (t.granularity as DecompTaskFinding['granularity'])
        : 'ok';
      const testability = TESTABILITIES.includes(t.testability as never)
        ? (t.testability as DecompTaskFinding['testability'])
        : 'ok';
      return {
        index,
        granularity,
        reason: asString(t.reason),
        suggestion: asString(t.suggestion),
        testability,
      };
    })
    .filter((t): t is DecompTaskFinding => t !== null);

  const rawCoverage =
    typeof data.coverage === 'object' && data.coverage !== null
      ? (data.coverage as Record<string, unknown>)
      : {};
  const coverage: DecompCoverage = {
    uncovered: Array.isArray(rawCoverage.uncovered)
      ? rawCoverage.uncovered.map(asString).filter(Boolean)
      : [],
    orphans: Array.isArray(rawCoverage.orphans)
      ? rawCoverage.orphans.map(asInt).filter((n) => n >= 0)
      : [],
  };

  const summary = asString(data.summary);
  const verdict = VERDICTS.includes(data.verdict as never)
    ? (data.verdict as DecompositionReviewResult['verdict'])
    : 'needs-review';

  // 垃圾数据判定：一条有效评估/覆盖度线索/摘要都没有才视为空形态
  if (tasks.length === 0 && coverage.uncovered.length === 0 && coverage.orphans.length === 0 && !summary) {
    return null;
  }
  return { tasks, coverage, verdict, summary };
}

export function useDecompositionReview() {
  return useMutation({
    mutationFn: async (input: {
      tasks: Array<Record<string, unknown>>;
      detail?: string | null;
    }): Promise<DecompositionReviewResult> => {
      if (input.tasks.length === 0) {
        throw new Error('这份提案没有新增任务，无需评估');
      }
      const result = await assistantApi.silent('decomposition-review', {
        context: { tasks: input.tasks, detail: input.detail ?? undefined },
      });
      const parsed = parseDecompositionReview(result.data);
      if (!parsed) {
        throw new Error('AI 没有给出可用的评估内容，请重试');
      }
      return parsed;
    },
  });
}
