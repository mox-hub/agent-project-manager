import { useMutation } from '@tanstack/react-query';
import { assistantApi } from '../api/assistant-api';

/**
 * 组合件提案生成（CAP-P-01 二期）：读需求承接剧本的「任务拆解」「验收草案」
 * 两份工件，AI 代写「任务族 + 每任务验收标准」payload，前端提交为 plan 卡进收件箱。
 */

export interface IntakeCompositeTask {
  title: string;
  description?: string;
  estimate?: number;
  acceptance?: {
    criteria: Array<{
      criteriaType?: 'functional' | 'technical';
      content: string;
      category?: string;
    }>;
  };
}

/** 防御性收敛：title 必填、criteria 过滤空 content、上限 20 任务 */
export function parseIntakeComposite(
  data: Record<string, unknown>,
): IntakeCompositeTask[] {
  const raw = data.tasks;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => {
      const title = typeof item.title === 'string' ? item.title.trim() : '';
      if (!title) return null;
      const task: IntakeCompositeTask = {
        title,
        description:
          typeof item.description === 'string' && item.description.trim()
            ? item.description.trim()
            : undefined,
        estimate: typeof item.estimate === 'number' && item.estimate > 0 ? Math.round(item.estimate) : undefined,
      };
      const acceptance = item.acceptance;
      if (typeof acceptance === 'object' && acceptance !== null) {
        const criteriaRaw = (acceptance as Record<string, unknown>).criteria;
        if (Array.isArray(criteriaRaw)) {
          const criteria = criteriaRaw
            .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
            .map((c) => ({
              criteriaType:
                c.criteriaType === 'technical' ? ('technical' as const) : ('functional' as const),
              content: typeof c.content === 'string' ? c.content.trim() : '',
              category:
                typeof c.category === 'string' && c.category.trim() ? c.category.trim() : undefined,
            }))
            .filter((c) => !!c.content)
            .slice(0, 4);
          if (criteria.length > 0) {
            task.acceptance = { criteria };
          }
        }
      }
      return task;
    })
    .filter((t): t is IntakeCompositeTask => t !== null)
    .slice(0, 20);
}

export function useIntakeComposite(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (input: {
      breakdownDocumentId?: string;
      acceptanceDocumentId?: string;
    }): Promise<IntakeCompositeTask[]> => {
      const result = await assistantApi.silent('intake-composite', {
        projectId,
        context: {
          breakdownDocumentId: input.breakdownDocumentId,
          acceptanceDocumentId: input.acceptanceDocumentId,
        },
      });
      const parsed = parseIntakeComposite(result.data);
      if (parsed.length === 0) {
        throw new Error('AI 没有给出可用的任务族，请重试');
      }
      return parsed;
    },
  });
}
