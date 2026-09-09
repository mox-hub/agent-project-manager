import { useMutation } from '@tanstack/react-query';
import { assistantApi } from '../api/assistant-api';

/**
 * grill 需求拷问（创建面板 AI 代理模式）：无状态多轮——
 * 每轮把已问答历史全量传给 grill-next 场景，AI 出下一问（含猜测选项）
 * 或在收敛时输出结构化需求摘要。无服务端会话态。
 */

export interface GrillChoice {
  key: string;
  label: string;
  sub?: string;
  /** AI 对用户想法的猜测标记（选项仅降低思考负担，非限制） */
  guess?: boolean;
}

export interface GrillQuestion {
  kind: 'question';
  question: string;
  choices: GrillChoice[];
}

export interface GrillSummary {
  name: string;
  description: string;
  goals: string[];
  users: string[];
  scope: string[];
  nonGoals: string[];
  constraints: string[];
  acceptanceHints: string[];
}

export type GrillResult =
  | GrillQuestion
  | { kind: 'done'; summary: GrillSummary };

export interface GrillTurn {
  question: string;
  answer: string;
}

const SUMMARY_KEYS = [
  'description',
  'goals',
  'users',
  'scope',
  'nonGoals',
  'constraints',
  'acceptanceHints',
] as const;

/** 防御性收敛模型输出：字段缺失/形状不对逐项丢弃，绝不抛给调用方 */
export function parseGrillResult(data: Record<string, unknown>): GrillResult | null {
  const done = data.done === true;
  if (done) {
    const raw = data.summary;
    if (typeof raw !== 'object' || raw === null) return null;
    const obj = raw as Record<string, unknown>;
    const name = typeof obj.name === 'string' ? obj.name.trim() : '';
    if (!name) return null;
    const summary: GrillSummary = {
      name,
      description: '',
      goals: [],
      users: [],
      scope: [],
      nonGoals: [],
      constraints: [],
      acceptanceHints: [],
    };
    for (const key of SUMMARY_KEYS) {
      const value = obj[key];
      if (key === 'description') {
        summary.description = typeof value === 'string' ? value.trim() : '';
      } else if (Array.isArray(value)) {
        summary[key] = value
          .filter((item): item is string => typeof item === 'string' && !!item.trim())
          .map((item) => item.trim())
          .slice(0, 10);
      }
    }
    return { kind: 'done', summary };
  }

  const question = typeof data.question === 'string' ? data.question.trim() : '';
  if (!question) return null;
  const choices: GrillChoice[] = Array.isArray(data.choices)
    ? (data.choices as unknown[])
        .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
        .slice(0, 4)
        .map((item, index) => ({
          key: typeof item.key === 'string' && item.key ? item.key : String(index),
          label: typeof item.label === 'string' ? item.label : '',
          sub: typeof item.sub === 'string' && item.sub ? item.sub : undefined,
          guess: item.guess === true,
        }))
        .filter((item) => !!item.label)
    : [];
  return { kind: 'question', question, choices };
}

export function useGrill() {
  return useMutation({
    mutationFn: async (input: {
      draft?: string;
      history: GrillTurn[];
    }): Promise<GrillResult> => {
      const result = await assistantApi.silent('grill-next', {
        context: { draft: input.draft, history: input.history },
      });
      const parsed = parseGrillResult(result.data);
      if (!parsed) {
        throw new Error('AI 没有给出有效的追问或摘要，请重试');
      }
      return parsed;
    },
  });
}
