/**
 * 工单列表行属性就地编辑单元格族（CAP-A-08 列表要素即时生效）。
 *
 * 每个单元格 = 既有静态渲染原样保留（CellSelect children）+ 点选下拉即 mutate：
 * mutation 链路与右键菜单（useIssueRowMenu → row-context-menu）完全同源——
 * 状态/优先级/严重度走 useUpdateTask，负责人走 useAssignPrimaryMember（Member 口径
 * /issue-assignees），类型走 PATCH typeId（typeId 事实源），里程碑走 milestoneId。
 */

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { CellSelect, type CellSelectOption } from '@/shared/components/cell-select';
import {
  PRIORITY_CONFIG,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
} from '@/shared/context-menu/row-context-menu';
import { useUpdateTask } from '../hooks/use-project-tasks';
import { useProjectMilestones } from '../hooks/use-project-tasks';
import { useAssignPrimaryMember } from '../hooks/use-assignee-sync';
import { useIssueTypes } from '../hooks/use-issue-types';
import { useMembers } from '@/modules/team-member/hooks';
import type { Task, TaskPriority, BugSeverity } from '../api/issue-api';

/** 状态（五态枚举） */
export function StatusCell({ task, children }: { task: Task; children: React.ReactNode }) {
  const { t } = useTranslation();
  const update = useUpdateTask();
  return (
    <CellSelect
      title={t('contextMenu.status', '状态')}
      value={task.status}
      onChange={(status) => update.mutate({ issueId: task.id, data: { status: status as Task['status'] } })}
      options={Object.entries(STATUS_CONFIG).map(([value, cfg]) => {
        const { Icon } = cfg;
        return {
          value,
          label: cfg.label,
          icon: <Icon className={cn('h-4 w-4', cfg.color)} />,
        };
      })}
    >
      {children}
    </CellSelect>
  );
}

/** 优先级（critical/high/medium/low，与右键菜单同源） */
export function PriorityCell({ task, children }: { task: Task; children: React.ReactNode }) {
  const { t } = useTranslation();
  const update = useUpdateTask();
  return (
    <CellSelect
      title={t('contextMenu.priority', '优先级')}
      value={task.priority}
      onChange={(priority) => update.mutate({ issueId: task.id, data: { priority: priority as TaskPriority } })}
      options={Object.entries(PRIORITY_CONFIG).map(([value, cfg]) => {
        const Icon = cfg.Icon;
        return {
          value,
          label: cfg.label,
          icon: <Icon className={cn('h-4 w-4', cfg.color)} />,
        };
      })}
    >
      {children}
    </CellSelect>
  );
}

/** 严重度（Bug 专属，色块圆点） */
export function SeverityCell({ task, children }: { task: Task; children: React.ReactNode }) {
  const { t } = useTranslation();
  const update = useUpdateTask();
  return (
    <CellSelect
      title={t('contextMenu.severity', '严重度')}
      value={task.severity ?? 'medium'}
      onChange={(severity) => update.mutate({ issueId: task.id, data: { severity: severity as BugSeverity } })}
      options={Object.entries(SEVERITY_CONFIG).map(([value, cfg]) => ({
        value,
        label: cfg.label,
        icon: (
          <span
            className="inline-block size-3 shrink-0 rounded-full ring-1 ring-border/40"
            style={{ backgroundColor: cfg.color }}
          />
        ),
      }))}
    >
      {children}
    </CellSelect>
  );
}

/**
 * 负责人（Member 口径走 /issue-assignees；候选多时与右键菜单一致）。
 * children 传既有头像渲染（避免本组件重复实现头像）。
 */
export function AssigneeCell({ task, children }: { task: Task; children: React.ReactNode }) {
  const { t } = useTranslation();
  const membersQuery = useMembers({ limit: 200 });
  const assign = useAssignPrimaryMember();
  const currentAssigneeId = task.assignee?.id;
  const hasAssignee = !!currentAssigneeId || !!task.aiAgentId;

  const options: CellSelectOption[] = [
    { value: '__none__', label: t('contextMenu.unassigned', '未分配'), active: !hasAssignee },
    ...(membersQuery.data?.items ?? []).map((m) => ({
      value: m.id,
      label: m.displayName,
      active: !!currentAssigneeId && currentAssigneeId === (m.userId ?? m.id),
    })),
  ];
  return (
    <CellSelect
      title={t('contextMenu.assignee', '负责人')}
      value={currentAssigneeId}
      onChange={(memberId) => assign.mutate({ issueId: task.id, memberId: memberId === '__none__' ? null : memberId })}
      options={options}
      menuClassName="w-44"
    >
      {children}
    </CellSelect>
  );
}

/** 里程碑（按行项目拉候选；无项目/无候选时退化为只读 chip） */
export function MilestoneCell({ task, children }: { task: Task; children: React.ReactNode }) {
  const { t } = useTranslation();
  const { data: milestones } = useProjectMilestones(task.projectId ?? undefined);
  const update = useUpdateTask();
  if (!milestones || milestones.length === 0) {
    return <>{children}</>;
  }
  const currentId = task.milestoneId ?? task.milestone?.id ?? '';
  return (
    <CellSelect
      title={t('issueCell.milestone', '里程碑')}
      value={currentId}
      onChange={(milestoneId) =>
        update.mutate({ issueId: task.id, data: { milestoneId: milestoneId === '' ? null : milestoneId } })
      }
      options={[
        { value: '', label: t('issueCell.noMilestone', '无里程碑'), active: currentId === '' },
        ...milestones.map((m) => ({ value: m.id, label: m.name, active: m.id === currentId })),
      ]}
      menuClassName="w-44"
    >
      {children}
    </CellSelect>
  );
}

/** 工单类型（typeId 事实源，与详情页 IssueTypeSwitcher 同语义） */
export function IssueTypeCell({ task, children }: { task: Task; children: React.ReactNode }) {
  const { t } = useTranslation();
  const { types } = useIssueTypes();
  const update = useUpdateTask();
  if (types.length === 0) {
    return <>{children}</>;
  }
  return (
    <CellSelect
      title={t('issueCell.type', '工单类型')}
      value={task.typeId ?? undefined}
      onChange={(typeId) => update.mutate({ issueId: task.id, data: { typeId } })}
      options={types.map((tp) => ({
        value: tp.id,
        label: tp.name,
        icon: (
          <span
            className="inline-block size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: tp.color || '#94A3B8' }}
          />
        ),
        active: tp.id === task.typeId,
      }))}
    >
      {children}
    </CellSelect>
  );
}
