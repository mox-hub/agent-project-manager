/**
 * 工单列表行属性就地编辑单元格族（CAP-A-08 列表要素即时生效）。
 *
 * 每个单元格 = 既有静态渲染原样保留（CellSelect children）+ 点选下拉即 mutate：
 * mutation 链路与右键菜单（useIssueRowMenu → row-context-menu）完全同源——
 * 状态/优先级/严重度走 useUpdateTask，负责人走 useAssignPrimaryMember（Member 口径
 * /issue-assignees），类型走 PATCH typeId（typeId 事实源），里程碑走 milestoneId。
 *
 * §21.2 observer 密度阀门（CAP-B-10）：候选数据（成员/类型/里程碑）与 mutation
 * 一律由列表级 `IssueCellDataProvider` 单例下发（609 行 × 7 hook = 4300 observer
 * 的逐行实例化是任务列表页卡顿主因）；未挂 Provider 的消费方**只读降级**
 * （渲染 children 不挂编辑器），新消费方禁走只读形态。
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { CellSelect, type CellSelectOption } from '@/shared/components/cell-select';
import {
  PRIORITY_CONFIG,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
} from '@/shared/context-menu/row-context-menu';
import { taskApi, type MilestoneRef, type UpdateTaskRequest } from '../api/issue-api';
import { useUpdateTask } from '../hooks/use-project-tasks';
import { useIssueTypes } from '../hooks/use-issue-types';
import { useAssignPrimaryMember } from '../hooks/use-assignee-sync';
import { useMembers } from '@/modules/team-member/hooks';
import type { Task, TaskPriority, BugSeverity } from '../api/issue-api';

// ============================================================================
// §21.2 列表级数据单例（Provider）
// ============================================================================

interface IssueCellDataContextValue {
  /** 成员候选（原每行 useMembers({limit:200}) 收编） */
  members: Array<{ id: string; userId?: string | null; displayName?: string | null }>;
  /** 工单类型（原每行 useIssueTypes 收编） */
  issueTypes: ReturnType<typeof useIssueTypes>['types'];
  /** 里程碑按项目聚合（原每行 useProjectMilestones 收编；未加载完成的项目缺席） */
  milestonesByProject: Map<string, MilestoneRef[]>;
  updateTask: (variables: { issueId: string; data: UpdateTaskRequest }) => void;
  assignPrimaryMember: (variables: { issueId: string; memberId: string | null }) => void;
}

const IssueCellDataContext = createContext<IssueCellDataContextValue | null>(null);

/**
 * 列表级数据闸门：在清单组件根部挂一次，传入当前列表出现过的 projectId 集合。
 * 里程碑沿用 useProjectMilestones 的 queryKey（['projectMilestones', projectId]）共享缓存。
 */
export function IssueCellDataProvider({
  projectIds,
  children,
}: {
  projectIds: ReadonlyArray<string | null | undefined>;
  children: ReactNode;
}) {
  const membersQuery = useMembers({ limit: 200 });
  const { types } = useIssueTypes();
  const update = useUpdateTask();
  const assign = useAssignPrimaryMember();

  const uniqueProjectIds = useMemo(
    () => [...new Set(projectIds.filter((v): v is string => !!v))],
    [projectIds],
  );
  const milestoneQueries = useQueries({
    queries: uniqueProjectIds.map((projectId) => ({
      queryKey: ['projectMilestones', projectId] as const,
      queryFn: () => taskApi.getProjectMilestones(projectId),
    })),
  });
  // 里程碑映射逐渲染重建（项目数=列表去重数，个小；数据到位即入表，未到位缺席走只读降级）
  const milestonesByProject = new Map<string, MilestoneRef[]>();
  milestoneQueries.forEach((query, index) => {
    const data = query.data;
    if (data) milestonesByProject.set(uniqueProjectIds[index], data);
  });

  // context value 不做 memo：值变化（成员/类型/里程碑到位）即应触发单元格重渲染挂上编辑器，
  // 其余渲染与所在行重渲染同频，无额外成本
  const value: IssueCellDataContextValue = {
    members: membersQuery.data?.items ?? [],
    issueTypes: types,
    milestonesByProject,
    updateTask: (variables) => update.mutate(variables),
    assignPrimaryMember: (variables) => assign.mutate(variables),
  };
  return <IssueCellDataContext.Provider value={value}>{children}</IssueCellDataContext.Provider>;
}

/** 单元格数据口：无 Provider 返回 null（单元格走只读降级） */
function useIssueCellData(): IssueCellDataContextValue | null {
  return useContext(IssueCellDataContext);
}

// ============================================================================
// 单元格族
// ============================================================================

/** 状态（五态枚举） */
export function StatusCell({ task, children }: { task: Task; children: React.ReactNode }) {
  const { t } = useTranslation();
  const ctx = useIssueCellData();
  if (!ctx) return <>{children}</>;
  return (
    <CellSelect
      title={t('contextMenu.status', '状态')}
      value={task.status}
      onChange={(status) => ctx.updateTask({ issueId: task.id, data: { status: status as Task['status'] } })}
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
  const ctx = useIssueCellData();
  if (!ctx) return <>{children}</>;
  return (
    <CellSelect
      title={t('contextMenu.priority', '优先级')}
      value={task.priority}
      onChange={(priority) => ctx.updateTask({ issueId: task.id, data: { priority: priority as TaskPriority } })}
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
  const ctx = useIssueCellData();
  if (!ctx) return <>{children}</>;
  return (
    <CellSelect
      title={t('contextMenu.severity', '严重度')}
      value={task.severity ?? 'medium'}
      onChange={(severity) => ctx.updateTask({ issueId: task.id, data: { severity: severity as BugSeverity } })}
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
  const ctx = useIssueCellData();
  if (!ctx) return <>{children}</>;
  const currentAssigneeId = task.assignee?.id;
  const hasAssignee = !!currentAssigneeId || !!task.aiAgentId;

  const options: CellSelectOption[] = [
    { value: '__none__', label: t('contextMenu.unassigned', '未分配'), active: !hasAssignee },
    ...ctx.members.map((m) => ({
      value: m.id,
      label: m.displayName,
      active: !!currentAssigneeId && currentAssigneeId === (m.userId ?? m.id),
    })),
  ];
  return (
    <CellSelect
      title={t('contextMenu.assignee', '负责人')}
      value={currentAssigneeId}
      onChange={(memberId) => ctx.assignPrimaryMember({ issueId: task.id, memberId: memberId === '__none__' ? null : memberId })}
      options={options}
      menuClassName="w-44"
    >
      {children}
    </CellSelect>
  );
}

/** 里程碑（按行项目取候选；无项目/未加载/无候选时退化为只读 chip） */
export function MilestoneCell({ task, children }: { task: Task; children: React.ReactNode }) {
  const { t } = useTranslation();
  const ctx = useIssueCellData();
  const milestones = ctx && task.projectId ? ctx.milestonesByProject.get(task.projectId) : undefined;
  if (!ctx || !milestones || milestones.length === 0) {
    return <>{children}</>;
  }
  const currentId = task.milestoneId ?? task.milestone?.id ?? '';
  return (
    <CellSelect
      title={t('issueCell.milestone', '里程碑')}
      value={currentId}
      onChange={(milestoneId) =>
        ctx.updateTask({ issueId: task.id, data: { milestoneId: milestoneId === '' ? null : milestoneId } })
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
  const ctx = useIssueCellData();
  if (!ctx || ctx.issueTypes.length === 0) {
    return <>{children}</>;
  }
  return (
    <CellSelect
      title={t('issueCell.type', '工单类型')}
      value={task.typeId ?? undefined}
      onChange={(typeId) => ctx.updateTask({ issueId: task.id, data: { typeId } })}
      options={ctx.issueTypes.map((tp) => ({
        value: tp.id,
        label: tp.name,
        icon: (
          <span
            className="inline-block size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: tp.color || 'hsl(var(--muted-foreground))' }}
          />
        ),
        active: tp.id === task.typeId,
      }))}
    >
      {children}
    </CellSelect>
  );
}
