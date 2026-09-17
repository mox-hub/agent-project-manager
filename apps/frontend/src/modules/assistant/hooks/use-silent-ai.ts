/**
 * 统一后台静默 AI 接入 —— 前端侧协议消费（POST /ai/assistant/silent）。
 * 场景名与响应 JSON 约定见 server assistant-silent.service.ts 的 SCENARIOS 注册表：
 * - quick-prompts      → { prompts: string[] }            助理输入框快捷问法
 * - create-suggestions → { suggestions: [{label,field,value}] } 创建面板建议 chips
 * - create-draft       → { type, fields } 创建面板 AI 代理草稿（CAP-A-18 双界面）
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

/** 验收标准代写（兜底改造批 3）：按工单 id 或创建面板草稿字段生成草案 */
export interface AcceptanceCriteriaDraft {
  content: string;
  criteriaType?: string;
  severity?: string;
  category?: string;
}

export function useSilentAcceptanceDraft() {
  return useMutation({
    mutationFn: (input: {
      issueId?: string;
      title?: string;
      description?: string;
      type?: string;
      projectId?: string;
    }) =>
      assistantApi.silent('acceptance-draft', {
        projectId: input.projectId,
        context: {
          ...(input.issueId ? { issueId: input.issueId } : {}),
          title: input.title,
          description: input.description,
          type: input.type,
        },
      }),
    retry: false,
  });
}

/** 解析 acceptance-draft 响应为标准草案列表 */
export function parseAcceptanceDraft(
  data: Record<string, unknown> | undefined,
): AcceptanceCriteriaDraft[] {
  const arr = data?.criteria;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((raw) => raw as Record<string, unknown>)
    .filter((c) => typeof c.content === 'string' && c.content.trim())
    .map((c) => ({
      content: String(c.content),
      criteriaType: typeof c.criteriaType === 'string' ? c.criteriaType : 'functional',
      severity: typeof c.severity === 'string' ? c.severity : 'medium',
      category: typeof c.category === 'string' ? c.category : undefined,
    }));
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

/** 创建面板 AI 代理草稿（CAP-A-18）：type + 可回填字段集 */
export interface CreateDraft {
  type: 'task' | 'bug' | 'doc' | 'project' | 'milestone';
  fields: {
    title: string;
    description?: string;
    priority?: string;
    severity?: string;
    status?: string;
    dueDate?: string;
    labels?: string[];
    category?: string;
  };
}

const CREATE_DRAFT_TYPES: CreateDraft['type'][] = [
  'task',
  'bug',
  'doc',
  'project',
  'milestone',
];

/** 创建面板 AI 代理：一句话自然语言 → 结构化草稿（人确认后复用手动提交流落库） */
export function useSilentCreateDraft() {
  return useMutation({
    mutationFn: (input: {
      prompt: string;
      typeHint?: CreateDraft['type'];
      projectId?: string;
    }) =>
      assistantApi.silent('create-draft', {
        projectId: input.projectId,
        context: { prompt: input.prompt, typeHint: input.typeHint },
      }),
    retry: false,
  });
}

/** 解析 create-draft 响应；type 非法或缺标题返回 null（由调用方降级） */
export function parseCreateDraft(
  data: Record<string, unknown> | undefined,
): CreateDraft | null {
  const type = data?.type;
  const fields = data?.fields;
  if (
    typeof type !== 'string' ||
    !(CREATE_DRAFT_TYPES as string[]).includes(type) ||
    !fields ||
    typeof fields !== 'object' ||
    Array.isArray(fields)
  ) {
    return null;
  }
  const f = fields as Record<string, unknown>;
  const title =
    typeof f.title === 'string' && f.title.trim()
      ? f.title.trim()
      : typeof f.name === 'string' && f.name.trim()
        ? f.name.trim()
        : '';
  if (!title) return null;
  return {
    type: type as CreateDraft['type'],
    fields: {
      title,
      description: typeof f.description === 'string' ? f.description : undefined,
      priority: typeof f.priority === 'string' ? f.priority : undefined,
      severity: typeof f.severity === 'string' ? f.severity : undefined,
      status: typeof f.status === 'string' ? f.status : undefined,
      dueDate: typeof f.dueDate === 'string' ? f.dueDate : undefined,
      labels: Array.isArray(f.labels)
        ? f.labels.filter((x): x is string => typeof x === 'string' && x.length > 0)
        : undefined,
      category: typeof f.category === 'string' ? f.category : undefined,
    },
  };
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
