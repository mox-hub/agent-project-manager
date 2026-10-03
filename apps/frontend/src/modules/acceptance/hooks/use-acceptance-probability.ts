import { useMutation, useQueryClient } from '@tanstack/react-query';
import { judgeAcceptanceProbability } from '@/modules/acceptance/api/acceptance-probability-api';

/**
 * AI 预估达成概率（CAP-A-27 扩展批二）：手动触发批量判定（advisory 展示位）。
 * 日常渲染直接读 criteria.acceptanceProbability 投影（readCriteriaProbability，
 * 零隐式调用）；本 mutation 供「刷新预估」按钮使用，成功后失效验收查询让投影回流。
 */
export function useJudgeAcceptanceProbability(acceptanceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (criteriaIds?: string[]) => {
      if (!acceptanceId) throw new Error('acceptanceId required');
      const data = await judgeAcceptanceProbability(acceptanceId, criteriaIds);
      queryClient.invalidateQueries({ queryKey: ['acceptance'] });
      return data;
    },
  });
}
