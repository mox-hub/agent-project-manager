/**
 * 统一后台静默 AI 接入 —— 前端侧协议消费（POST /ai/assistant/silent）。
 * 场景名与响应 JSON 约定见 server assistant-silent.service.ts 的 SCENARIOS 注册表：
 * - quick-prompts      → { prompts: string[] }            助理输入框快捷问法
 * - create-suggestions → { suggestions: [{label,field,value}] } 创建面板建议 chips
 * - project-score      → { score, summary, risks[], suggestions[] } 项目 AI 洞察
 * 全部场景：无 provider/解析失败 → 可读 400，调用方自行回落静态兜底。
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { assistantApi } from '../api/assistant-api';
import type { AssistantViewing } from '../api/assistant-api';

export interface CreateSuggestion {
  label: string;
  field: string;
  value: string;
}

export interface ProjectScoreInsight {
  score?: number;
  summary?: string;
  risks?: string[];
  suggestions?: string[];
}

/** 快捷问法：面板打开时静默拉取（5min 缓存），失败/空返回 [] 由组件回落静态项 */
export function useSilentQuickPrompts(
  projectId?: string,
  viewing?: AssistantViewing | null,
) {
  return useQuery({
    queryKey: [
      'assistant',
      'silent',
      'quick-prompts',
      projectId ?? null,
      viewing?.type ?? null,
      viewing?.id ?? null,
    ],
    queryFn: () =>
      assistantApi.silent('quick-prompts', {
        projectId,
        context: viewing ? { viewing } : undefined,
      }),
    staleTime: 5 * 60 * 1000,
    retry: false,
    select: (res) => {
      const prompts = res.data?.prompts;
      return Array.isArray(prompts)
        ? prompts
            .filter((p): p is string => typeof p === 'string' && p.length > 0)
            .slice(0, 4)
        : [];
    },
  });
}

/** 创建面板建议：按需触发（传入当前表单草稿快照） */
export function useSilentCreateSuggestions() {
  return useMutation({
    mutationFn: (input: {
      type: string;
      fields: Record<string, unknown>;
      projectId?: string;
    }) =>
      assistantApi.silent('create-suggestions', {
        projectId: input.projectId,
        context: { type: input.type, fields: input.fields },
      }),
    retry: false,
  });
}

/** 解析 create-suggestions 响应为可渲染/可回填的建议列表 */
export function parseCreateSuggestions(
  data: Record<string, unknown> | undefined,
): CreateSuggestion[] {
  const arr = data?.suggestions;
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(
      (it): it is Record<string, unknown> =>
        !!it && typeof it === 'object' && !Array.isArray(it),
    )
    .filter(
      (it) =>
        typeof it.label === 'string' &&
        it.label.length > 0 &&
        typeof it.field === 'string' &&
        typeof it.value === 'string',
    )
    .map((it) => ({
      label: it.label as string,
      field: it.field as string,
      value: it.value as string,
    }))
    .slice(0, 5);
}

/** 项目 AI 洞察：在规则健康分之上叠加一次静默分析 */
export function useSilentProjectScore() {
  return useMutation({
    mutationFn: (input: { projectId: string; context: Record<string, unknown> }) =>
      assistantApi.silent('project-score', input),
    retry: false,
  });
}

/** 卡片就地解释（CAP-C-07 AISlot）：Ctrl/Cmd+左键实体卡片触发 */
export function useCardExplain() {
  return useMutation({
    mutationFn: (input: {
      kind: string;
      id: string;
      question?: string;
      projectId?: string;
    }) =>
      assistantApi.silent('card-explain', {
        projectId: input.projectId,
        context: {
          entity: { kind: input.kind, id: input.id },
          question: input.question,
        },
      }),
    retry: false,
  });
}

export interface CardExplainDetail {
  label: string;
  text: string;
}

export interface CardExplainInsight {
  title?: string;
  summary?: string;
  details: CardExplainDetail[];
  nextStep?: string;
}

/** 解析 card-explain 响应（容错：字段缺失/类型不符时忽略） */
export function parseCardExplain(
  data: Record<string, unknown> | undefined,
): CardExplainInsight {
  const rawDetails = data?.details;
  const details = Array.isArray(rawDetails)
    ? rawDetails
        .filter(
          (it): it is Record<string, unknown> =>
            !!it && typeof it === 'object' && !Array.isArray(it),
        )
        .filter(
          (it) =>
            typeof it.label === 'string' &&
            it.label.length > 0 &&
            typeof it.text === 'string' &&
            it.text.length > 0,
        )
        .map((it) => ({ label: it.label as string, text: it.text as string }))
        .slice(0, 6)
    : [];
  return {
    title:
      typeof data?.title === 'string' && data.title.length > 0
        ? data.title
        : undefined,
    summary:
      typeof data?.summary === 'string' && data.summary.length > 0
        ? data.summary
        : undefined,
    details,
    nextStep:
      typeof data?.nextStep === 'string' && data.nextStep.length > 0
        ? data.nextStep
        : undefined,
  };
}


/** 解析 project-score 响应（容错：字段缺失/类型不符时忽略） */
export function parseProjectScore(
  data: Record<string, unknown> | undefined,
): ProjectScoreInsight {
  const num = data?.score;
  const strList = (v: unknown): string[] | undefined =>
    Array.isArray(v)
      ? v.filter((s): s is string => typeof s === 'string' && s.length > 0)
      : undefined;
  return {
    score: typeof num === 'number' ? num : undefined,
    summary: typeof data?.summary === 'string' ? data.summary : undefined,
    risks: strList(data?.risks),
    suggestions: strList(data?.suggestions),
  };
}
