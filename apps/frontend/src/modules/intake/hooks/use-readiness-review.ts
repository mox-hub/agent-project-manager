import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assistantApi } from '@/modules/assistant/api/assistant-api';

/**
 * 需求完备性评估（CAP-P-01 五期切片 2）：读调研/澄清/分析工件，AI 输出
 * 六维度三态评估 + 缺口账 + verdict。评估仅呈现给人（输入级软闸门），
 * 结果写入 React Query 缓存供管道卡徽章读取——不落库、不拦路，刷新后按需重评。
 */

export interface ReadinessDimension {
  key: string;
  status: 'ready' | 'unclear' | 'missing';
  evidence: string;
  gap: string;
}

export interface ReadinessGap {
  item: string;
  why: string;
  howToFill: string;
  blocking: boolean;
}

export interface ReadinessReviewResult {
  dimensions: ReadinessDimension[];
  missingInfo: ReadinessGap[];
  verdict: 'ready' | 'needs-clarification' | 'blocked';
  summary: string;
}

const DIMENSION_KEYS = ['goal', 'scope', 'scenario', 'acceptance', 'dependency', 'fallback'];
const DIMENSION_STATUSES = ['ready', 'unclear', 'missing'];
const VERDICTS = ['ready', 'needs-clarification', 'blocked'];

export const READINESS_DIMENSION_LABELS: Record<string, string> = {
  goal: '目标与价值',
  scope: '范围与边界',
  scenario: '用户与场景',
  acceptance: '验收可判定',
  dependency: '依赖与约束',
  fallback: '失败与降级',
};

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** 防御性收敛：key/status/verdict 不合法时降级为可渲染形态，绝不让 AI 脏数据炸 UI */
export function parseReadinessReview(
  data: Record<string, unknown>,
): ReadinessReviewResult | null {
  const rawDimensions = Array.isArray(data.dimensions) ? data.dimensions : [];
  const dimensions = rawDimensions
    .map((d) => {
      const item = typeof d === 'object' && d !== null ? (d as Record<string, unknown>) : {};
      const key = asString(item.key);
      const status = DIMENSION_STATUSES.includes(item.status as never)
        ? (item.status as ReadinessDimension['status'])
        : 'missing';
      return { key, status, evidence: asString(item.evidence), gap: asString(item.gap) };
    })
    .filter((d) => DIMENSION_KEYS.includes(d.key));

  const rawGaps = Array.isArray(data.missingInfo) ? data.missingInfo : [];
  const missingInfo = rawGaps
    .map((g) => {
      const item = typeof g === 'object' && g !== null ? (g as Record<string, unknown>) : {};
      return {
        item: asString(item.item),
        why: asString(item.why),
        howToFill: asString(item.howToFill),
        blocking: item.blocking === true,
      };
    })
    .filter((g) => !!g.item);

  const summary = asString(data.summary);
  // 垃圾数据判定：一条有效维度/缺口/摘要都没有才视为空形态（全 ready 是合法结果）
  if (dimensions.length === 0 && missingInfo.length === 0 && !summary) {
    return null;
  }

  // AI 漏维度时按 missing 补齐，保证六维度呈现完整
  for (const key of DIMENSION_KEYS) {
    if (!dimensions.some((d) => d.key === key)) {
      dimensions.push({ key, status: 'missing', evidence: '', gap: '' });
    }
  }

  const verdict = VERDICTS.includes(data.verdict as never)
    ? (data.verdict as ReadinessReviewResult['verdict'])
    : 'needs-clarification';

  return { dimensions, missingInfo, verdict, summary };
}

/** 缓存 key：评估结果按项目 + 触发纪要存取，管道卡徽章与对话框共享 */
export function readinessCacheKey(projectId: string, docId: string) {
  return ['readiness-review', projectId, docId] as const;
}

export function useReadinessReview(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      docId: string;
      analysisDocumentId?: string;
    }): Promise<ReadinessReviewResult> => {
      if (!projectId) throw new Error('缺少项目上下文，无法评估');
      const result = await assistantApi.silent('readiness-review', {
        projectId,
        context: {
          researchDocumentId: input.docId,
          analysisDocumentId: input.analysisDocumentId,
        },
      });
      const parsed = parseReadinessReview(result.data);
      if (!parsed) {
        throw new Error('AI 没有给出可用的评估内容，请重试');
      }
      return parsed;
    },
    onSuccess: (data, variables) => {
      if (projectId) {
        queryClient.setQueryData(readinessCacheKey(projectId, variables.docId), data);
      }
    },
  });
}
