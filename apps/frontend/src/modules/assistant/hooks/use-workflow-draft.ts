import { useMutation } from '@tanstack/react-query';
import { assistantApi } from '../api/assistant-api';

/**
 * 工作流草拟（CAP-A-12 切片④）：自然语言描述 → workflow-draft 静默场景
 * 生成 definition 草稿（name/description/steps），进画布编辑器人工修改后保存。
 */

export interface WorkflowDraft {
  name: string;
  description: string;
  steps: Array<Record<string, unknown>>;
}

/** 防御性收敛模型输出：形状不对整单拒绝，绝不出半截草稿 */
export function parseWorkflowDraft(data: Record<string, unknown>): WorkflowDraft | null {
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const steps = Array.isArray(data.steps)
    ? (data.steps as unknown[]).filter(
        (s): s is Record<string, unknown> =>
          typeof s === 'object' && s !== null && typeof (s as { id?: unknown }).id === 'string',
      )
    : [];
  if (!name || steps.length === 0) return null;
  return {
    name,
    description: typeof data.description === 'string' ? data.description.trim() : '',
    steps,
  };
}

export function useWorkflowDraft() {
  return useMutation({
    mutationFn: async (input: { description: string }): Promise<WorkflowDraft> => {
      const result = await assistantApi.silent('workflow-draft', {
        context: { description: input.description },
      });
      const parsed = parseWorkflowDraft(result.data);
      if (!parsed) {
        throw new Error('AI 没有给出可用的流程草稿，请换个说法再试');
      }
      return parsed;
    },
  });
}
