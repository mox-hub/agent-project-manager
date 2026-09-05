import { useMutation } from '@tanstack/react-query';
import { assistantApi } from '../api/assistant-api';

/** 行内锚点问答（候选 B）：锚点=显式上下文，服务端精确 grounding 后作答 */

export type AnchorQaActionType =
  | 'task.update_status'
  | 'task.update_priority'
  | 'task.update_due_date';

export interface AnchorQaAction {
  label: string;
  action: AnchorQaActionType;
  params: Record<string, string>;
}

export interface AnchorQaResult {
  answer: string;
  actions?: AnchorQaAction[];
}

export function useAnchorQa(projectId: string | undefined, taskId: string) {
  return useMutation({
    mutationFn: async (question: string): Promise<AnchorQaResult> => {
      const result = await assistantApi.silent('anchor-qa', {
        projectId,
        context: { anchor: { kind: 'task', id: taskId }, question },
      });
      const data = result.data as {
        answer?: unknown;
        actions?: unknown;
      };
      return {
        answer: typeof data.answer === 'string' ? data.answer : '',
        actions: normalizeActions(data.actions),
      };
    },
  });
}

/** 动作白名单：只放行服务端约定的三种就地落库动作，防御性收敛形状 */
export function normalizeActions(raw: unknown): AnchorQaAction[] {
  if (!Array.isArray(raw)) return [];
  const allowed: AnchorQaActionType[] = [
    'task.update_status',
    'task.update_priority',
    'task.update_due_date',
  ];
  return raw
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null,
    )
    .filter((item) =>
      allowed.includes(item.action as AnchorQaActionType),
    )
    .slice(0, 2)
    .map((item) => ({
      label:
        typeof item.label === 'string' && item.label
          ? item.label
          : String(item.action),
      action: item.action as AnchorQaActionType,
      params:
        typeof item.params === 'object' && item.params !== null
          ? (Object.fromEntries(
              Object.entries(item.params as Record<string, unknown>).map(
                ([k, v]) => [k, String(v)],
              ),
            ) as Record<string, string>)
          : {},
    }));
}
