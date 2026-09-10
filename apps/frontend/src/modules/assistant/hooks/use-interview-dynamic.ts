import { useMutation } from '@tanstack/react-query';
import { assistantApi } from '../api/assistant-api';
import {
  parseInterviewPrefill,
  type InterviewPrefillAnswer,
  type InterviewPrefillQuestion,
} from './use-interview-prefill';

/**
 * 剧本访谈动态追问（CAP-P-01 三期）：无状态多轮——每轮把已答历史全量传给
 * interview-dynamic 场景，AI 基于问题组/阶段工件深挖澄清（一问 + 猜测选项），
 * 收敛时一次性给出问题组完整答案集（复用预填的答案过滤逻辑）。无服务端会话态。
 */

export interface DynamicInterviewTurn {
  question: string;
  answer: string;
}

export type DynamicInterviewResult =
  | { kind: 'question'; question: string; choices: string[] }
  | { kind: 'done'; answers: InterviewPrefillAnswer[] };

/** 防御性收敛模型输出：形状不对逐项丢弃，绝不抛给调用方 */
export function parseInterviewDynamic(
  data: Record<string, unknown>,
  questions: InterviewPrefillQuestion[],
): DynamicInterviewResult | null {
  if (data.done === true) {
    const answers = parseInterviewPrefill(data, questions);
    if (answers.length === 0) return null;
    return { kind: 'done', answers };
  }
  const question = typeof data.question === 'string' ? data.question.trim() : '';
  if (!question) return null;
  const choices = Array.isArray(data.choices)
    ? (data.choices as unknown[])
        .filter((item): item is string => typeof item === 'string' && !!item.trim())
        .map((item) => item.trim())
        .slice(0, 4)
    : [];
  return { kind: 'question', question, choices };
}

export function useInterviewDynamic(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (input: {
      questions: InterviewPrefillQuestion[];
      history: DynamicInterviewTurn[];
      stagePurpose?: string;
      artifactDocumentIds?: string[];
    }): Promise<DynamicInterviewResult> => {
      const result = await assistantApi.silent('interview-dynamic', {
        projectId,
        context: {
          questions: input.questions,
          history: input.history,
          stagePurpose: input.stagePurpose,
          artifactDocumentIds: input.artifactDocumentIds,
        },
      });
      const parsed = parseInterviewDynamic(result.data, input.questions);
      if (!parsed) {
        throw new Error('AI 没有给出有效的追问或答案，请重试');
      }
      return parsed;
    },
  });
}
