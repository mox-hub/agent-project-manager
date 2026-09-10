import { useMutation } from '@tanstack/react-query';
import { assistantApi } from '../api/assistant-api';

/**
 * 剧本访谈预填（CAP-P-01 一期）：按一句话需求（或 grill 摘要）为当前阶段
 * 问题组生成答案候选。AI 失败/解析为空时抛错，调用方降级为手填。
 */

export interface InterviewPrefillQuestion {
  id: string;
  question: string;
  hint?: string;
}

export interface InterviewPrefillAnswer {
  questionId: string;
  answer: string;
}

/** 防御性收敛：只保留 id+answer 齐全且问题组里存在的候选 */
export function parseInterviewPrefill(
  data: Record<string, unknown>,
  questions: InterviewPrefillQuestion[],
): InterviewPrefillAnswer[] {
  const validIds = new Set(questions.map((q) => q.id));
  const raw = data.answers;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      questionId: typeof item.questionId === 'string' ? item.questionId : '',
      answer: typeof item.answer === 'string' ? item.answer.trim() : '',
    }))
    .filter((item) => item.questionId && item.answer && validIds.has(item.questionId));
}

export function useInterviewPrefill(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (input: {
      requirement: string;
      questions: InterviewPrefillQuestion[];
    }): Promise<InterviewPrefillAnswer[]> => {
      const result = await assistantApi.silent('interview-prefill', {
        projectId,
        context: { requirement: input.requirement, questions: input.questions },
      });
      const parsed = parseInterviewPrefill(result.data, input.questions);
      if (parsed.length === 0) {
        throw new Error('AI 没有给出可用的答案候选');
      }
      return parsed;
    },
  });
}
