/**
 * 动态事件的展示映射：事件图标/tone、字段标签、字段值 i18n key。
 * 状态/优先级等语义值复用 shared/status/status-visuals 的唯一映射源。
 */
import { Bot, History, Loader2, MessageSquare, Pencil, Plus, UserRound, type LucideIcon } from 'lucide-react';
import type { StatusTone } from '@/shared/status/status-visuals';
import {
  PROJECT_STATUS_VISUALS,
  PROJECT_WORKFLOW_VISUALS,
  PRIORITY_VISUALS,
  TASK_STATUS_VISUALS,
} from '@/shared/status/status-visuals';
import type { ActivityEntityType, ActivityItem } from './api/activity-api';

export interface EventVisual {
  icon: LucideIcon;
  tone: StatusTone;
  spin?: boolean;
}

/** 事件类型 → 底框图标视觉（Linear 时间线风格） */
export function getEventVisual(activity: ActivityItem): EventVisual {
  const type = resolveActivityType(activity);
  switch (type) {
    case 'created':
      return { icon: Plus, tone: 'info' };
    case 'status_changed': {
      const value = String(
        activity.changes?.find((c) => c.field === 'status')?.newValue ?? '',
      );
      const visual =
        activity.entityType === 'project'
          ? (PROJECT_WORKFLOW_VISUALS[value] ?? PROJECT_STATUS_VISUALS[value])
          : TASK_STATUS_VISUALS[value];
      if (visual) {
        return { icon: visual.icon, tone: visual.tone, spin: visual.icon === Loader2 };
      }
      return { icon: History, tone: 'default' };
    }
    case 'assigned':
      return { icon: UserRound, tone: 'info' };
    case 'field_changed':
      return { icon: Pencil, tone: 'default' };
    case 'comment':
      return { icon: MessageSquare, tone: 'info' };
    case 'ai_execution':
      return { icon: Bot, tone: 'warning' };
    default:
      return { icon: History, tone: 'default' };
  }
}

/** 迁移旧数据兼容：Task created 老记录 type 是 status_changed */
export function resolveActivityType(activity: ActivityItem): string {
  if (activity.type === 'status_changed' && activity.summary === 'Task created') {
    return 'created';
  }
  return activity.type;
}

export function isCommentActivity(activity: ActivityItem): boolean {
  return resolveActivityType(activity) === 'comment';
}

/** 这些字段的值是外部 ID，时间线只展示字段名不展示值 */
export const OPAQUE_VALUE_FIELDS = new Set([
  'assigneeId',
  'projectId',
  'milestoneId',
  'iterationId',
  'aiAgentId',
  'dependencies',
  'labels',
]);

/** 字段展示名 i18n key */
export function fieldLabelKey(field: string): string {
  return `activity.field.${field}`;
}

/**
 * 字段值的 i18n key；返回 null 表示无语义映射（调用方回退展示原值）。
 */
export function fieldValueLabelKey(
  field: string,
  value: string | null | undefined,
  entityType: ActivityEntityType,
): string | null {
  if (!value) return null;
  if (field === 'status') {
    const visual =
      entityType === 'project'
        ? (PROJECT_WORKFLOW_VISUALS[value] ?? PROJECT_STATUS_VISUALS[value])
        : TASK_STATUS_VISUALS[value];
    return visual?.labelKey ?? null;
  }
  if (field === 'priority' || field === 'severity') {
    return PRIORITY_VISUALS[value]?.labelKey ?? null;
  }
  return null;
}

/** 事件动词 i18n key（渲染为「{{actor}} + 短语」） */
export function eventPhraseKey(activity: ActivityItem): string {
  const type = resolveActivityType(activity);
  switch (type) {
    case 'created':
      return 'activity.event.created';
    case 'status_changed':
      return 'activity.event.statusChanged';
    case 'assigned':
      return 'activity.event.assigned';
    case 'field_changed':
      return 'activity.event.fieldChanged';
    case 'ai_execution':
      return 'activity.event.aiExecution';
    default:
      return 'activity.event.generic';
  }
}
