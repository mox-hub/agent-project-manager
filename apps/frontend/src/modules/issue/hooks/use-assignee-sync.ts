import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  listTaskAssignees,
  addTaskAssignee,
  removeTaskAssignee,
} from '@/modules/team-member/api/team-member-api';
import {
  useTaskAssignees,
  useAddTaskAssignee,
  useRemoveTaskAssignee,
} from '@/modules/team-member/hooks';
import { toast } from '@/components/ui/toast';

/**
 * 任务主负责人同步（V3 口径）：真相源是 TaskAssignee 多对多，
 * 指派 = 先 add 新成员（服务端同步 Task.assigneeId/assigneeType/aiAgentId），
 * 再 remove 旧主负责人（服务端此时不会误清新负责人）。
 * 清空 = 仅 remove。禁止再把负责人写进 PATCH /tasks/:id 的 assigneeId
 * （该列外键是 User.id，Member.id 会触发外键约束 500）。
 */
export function useAssigneeSync(issueId: string | undefined) {
  const queryClient = useQueryClient();
  const { data: rows = [] } = useTaskAssignees(issueId);
  const add = useAddTaskAssignee();
  const remove = useRemoveTaskAssignee();

  const primary = rows[0] ?? null;

  async function assignTo(memberId?: string | null): Promise<void> {
    if (!issueId) return;
    const oldMemberId = primary?.memberId ?? '';
    const nextMemberId = memberId ?? '';
    if (nextMemberId === oldMemberId) return;

    if (nextMemberId) {
      await add.mutateAsync({ issueId, memberId: nextMemberId });
    }
    if (oldMemberId) {
      await remove.mutateAsync({
        issueId,
        memberId: oldMemberId,
        role: primary?.role ?? 'assignee',
      });
    }

    // 主负责人三字段随 add/remove 变化，任务视图一并刷新
    void queryClient.invalidateQueries({ queryKey: ['task', issueId] });
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
  }

  return {
    primary,
    assignTo,
    isPending: add.isPending || remove.isPending,
  };
}

/**
 * 主负责人指派（命令式，供行右键菜单等无法按行挂 hook 的场景）：
 * 与 useAssigneeSync 同一套真相源（TaskAssignee）——先 add 新成员
 * （服务端同步 Task.assigneeId/assigneeType/aiAgentId 三字段）再 remove 旧主负责人，
 * memberId 传 null 表示清空。禁止把 Member.id 写进 PATCH /tasks 的 assigneeId
 * （该列外键是 User.id，误传会被服务端 400 拒绝）。
 */
export function useAssignPrimaryMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ issueId, memberId }: { issueId: string; memberId: string | null }) => {
      const rows = await listTaskAssignees(issueId);
      const old = rows[0] ?? null;
      if ((memberId ?? '') === (old?.memberId ?? '')) return;
      if (memberId) await addTaskAssignee({ issueId, memberId });
      if (old) await removeTaskAssignee(issueId, old.memberId, old.role ?? 'assignee');
    },
    onSuccess: (_data, vars) => {
      // 主负责人三字段随 add/remove 变化，任务视图一并刷新
      void queryClient.invalidateQueries({ queryKey: ['task', vars.issueId] });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      void queryClient.invalidateQueries({ queryKey: ['allBugs'] });
    },
    onError: (err) => {
      toast.error('指派负责人失败: ' + (err instanceof Error ? err.message : '未知错误'));
    },
  });
}
