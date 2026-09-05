import { useQueryClient } from '@tanstack/react-query';
import {
  useTaskAssignees,
  useAddTaskAssignee,
  useRemoveTaskAssignee,
} from '@/modules/team-member/hooks';

/**
 * 任务主负责人同步（V3 口径）：真相源是 TaskAssignee 多对多，
 * 指派 = 先 add 新成员（服务端同步 Task.assigneeId/assigneeType/aiAgentId），
 * 再 remove 旧主负责人（服务端此时不会误清新负责人）。
 * 清空 = 仅 remove。禁止再把负责人写进 PATCH /tasks/:id 的 assigneeId
 * （该列外键是 User.id，Member.id 会触发外键约束 500）。
 */
export function useAssigneeSync(taskId: string | undefined) {
  const queryClient = useQueryClient();
  const { data: rows = [] } = useTaskAssignees(taskId);
  const add = useAddTaskAssignee();
  const remove = useRemoveTaskAssignee();

  const primary = rows[0] ?? null;

  async function assignTo(memberId?: string | null): Promise<void> {
    if (!taskId) return;
    const oldMemberId = primary?.memberId ?? '';
    const nextMemberId = memberId ?? '';
    if (nextMemberId === oldMemberId) return;

    if (nextMemberId) {
      await add.mutateAsync({ taskId, memberId: nextMemberId });
    }
    if (oldMemberId) {
      await remove.mutateAsync({
        taskId,
        memberId: oldMemberId,
        role: primary?.role ?? 'assignee',
      });
    }

    // 主负责人三字段随 add/remove 变化，任务视图一并刷新
    void queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
  }

  return {
    primary,
    assignTo,
    isPending: add.isPending || remove.isPending,
  };
}
