/**
 * useIssueRowMenu - 任务 / Bug 行右键菜单共享 Hook
 *
 * 列表（TaskSimpleList / BugSimpleList）与看板卡片（BoardView onItemContextMenu）
 * 复用同一套菜单构建逻辑：把「建菜单 + mutation + 元数据查询」集中到一处，
 * 保证同页 list 与 kanban 的右键菜单「内容 / 操作」完全一致（固定、复制链接、
 * 建子/父任务、删除等），避免两处各自重复实现后漂移。
 *
 * 参数：
 * - kind：决定标签按哪个功能域隔离（task 取任务标签、bug 取 Bug 标签），
 *   并决定「复制链接」的基础路径（/app/issues/:id 或 /app/bugs/:id）
 * - entityName：删除确认文案里的实体名（任务 / Bug）
 *
 * 注：本地「固定」态（pinned）随每次调用独立持有；list 与看板若同时挂载，
 * 两侧固定状态不互相同步——属既有设计，需求只要求菜单内容一致。
 */

import { useState } from 'react';
import type { MenuItem } from '@/components/ui/context-menu';
import {
  useCreateSubTask,
  useCreateTask,
  useDeleteTask,
  useUpdateTask,
} from '@/modules/issue/hooks/use-project-tasks';
import { useAssignPrimaryMember } from '@/modules/issue/hooks/use-assignee-sync';
import { buildTaskRowMenu } from '@/shared/context-menu/row-context-menu';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { useMembers } from '@/modules/team-member/hooks';
import { useTags } from '@/modules/core-config/hooks/use-metadata';
import type { Task } from '@/modules/issue/api/issue-api';

export interface UseIssueRowMenuOptions {
  /** 标签功能域 + 复制链接路径：task → /app/issues/:id，bug → /app/bugs/:id */
  kind?: 'task' | 'bug';
  /** 删除确认文案里的实体名（默认「任务」；Bug 传「Bug」） */
  entityName?: string;
}

export function useIssueRowMenu(
  options: UseIssueRowMenuOptions = {},
): (task: Task) => MenuItem[] {
  const { kind = 'task', entityName = '任务' } = options;

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createSubTask = useCreateSubTask();
  const createTask = useCreateTask();
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const confirmAction = useConfirm();

  // 真实元数据（负责人候选 + 可用标签；标签按功能域隔离，与各自列表口径一致）
  const membersQuery = useMembers({ limit: 200 });
  const tagsQuery = useTags(undefined, kind);
  const assignees = (membersQuery.data?.items ?? []).map((m) => ({
    id: m.id,
    userId: m.userId,
    displayName: m.displayName,
    handle: m.handle,
    avatarUrl: m.avatarUrl,
  }));
  const tagOptions = (tagsQuery.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
  }));
  // 主负责人指派走 TaskAssignee 真相源（Member.id 不允许进 PATCH /tasks 的 User 外键）
  const assignPrimaryMember = useAssignPrimaryMember();

  const onTogglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (task: Task): MenuItem[] =>
    buildTaskRowMenu({
      task,
      linkPath: kind === 'bug' ? `/app/bugs/${task.id}` : `/app/issues/${task.id}`,
      assignees,
      tags: tagOptions,
      pinned: pinnedIds.has(task.id),
      onTogglePin: () => onTogglePin(task.id),
      onUpdate: (data) => updateTask.mutate({ issueId: task.id, data }),
      onAssignMember: (memberId) =>
        assignPrimaryMember.mutate({ issueId: task.id, memberId }),
      onDelete: async () => {
        const ok = await confirmAction({
          title: `删除${entityName}「${task.title}」？`,
          description: `该操作会删除此${entityName}及其子任务，且不可撤销。`,
          confirmText: '删除',
          cancelText: '取消',
          variant: 'destructive',
        });
        if (ok) deleteTask.mutate(task.id);
      },
      onCreateChild: () => {
        const title = window.prompt('输入子任务标题');
        if (title?.trim()) {
          createSubTask.mutate({
            parentIssueId: task.id,
            title: title.trim(),
          });
        }
      },
      onCreateParent: () => {
        const title = window.prompt('输入父任务标题');
        if (!title?.trim()) return;
        createTask.mutate(
          { title: title.trim(), projectId: task.projectId ?? undefined },
          {
            onSuccess: (parent) =>
              updateTask.mutate({
                issueId: task.id,
                data: { parentIssueId: parent.id } as never,
              }),
          },
        );
      },
    });
}
