/**
 * status-visuals.ts - 任务 / 项目状态统一视觉映射
 *
 * 一套 tone 词表（对齐 StatusPill 语义色 + accent token）同时服务任务与项目两侧，
 * 取代散落在 task-simple-list / project-simple-list / 看板 / 甘特里的多份本地配色：
 *   default=灰（待办/积压/已取消） info=蓝（进行中） warning=黄（评审/计划/有风险）
 *   success=绿（完成/正常/进行中项目） danger=红（偏离/紧急）
 *
 * 消费方：project-simple-list（StatusPill + 日期/优先级）、row-context-menu（右键子菜单）、
 * project-board（五列分组）、project-gantt（条颜色）、task-simple-list（label 对齐）。
 */

import {
  Activity,
  Archive,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleX,
  Flame,
  Loader2,
  Minus,
  type LucideIcon,
} from 'lucide-react';

export type StatusTone = 'default' | 'info' | 'warning' | 'success' | 'danger';

export interface StatusVisual {
  /** i18n key（status.* 命名空间） */
  labelKey: string;
  tone: StatusTone;
  icon: LucideIcon;
}

/** tone → 文字色类（语义 accent token，禁原始色） */
export const TONE_TEXT_CLASS: Record<StatusTone, string> = {
  default: 'text-muted-foreground',
  info: 'text-accent-blue',
  warning: 'text-accent-yellow',
  success: 'text-accent-green',
  danger: 'text-accent-red',
};

/** tone → 色点/进度条填充类 */
export const TONE_DOT_CLASS: Record<StatusTone, string> = {
  default: 'bg-muted-foreground',
  info: 'bg-accent-blue',
  warning: 'bg-accent-yellow',
  success: 'bg-accent-green',
  danger: 'bg-accent-red',
};

/** tone → StatusPill 之外的浅底胶囊（菜单图标等轻量场景） */
export const TONE_LIGHT_CLASS: Record<StatusTone, string> = {
  default: 'bg-muted/50 text-muted-foreground',
  info: 'bg-accent-blue-light text-accent-blue',
  warning: 'bg-accent-yellow-light text-accent-yellow',
  success: 'bg-accent-green-light text-accent-green',
  danger: 'bg-accent-red-light text-accent-red',
};

/** 任务状态五态 */
export const TASK_STATUS_VISUALS: Record<string, StatusVisual> = {
  todo: { labelKey: 'status.task.todo', tone: 'default', icon: Circle },
  in_progress: { labelKey: 'status.task.in_progress', tone: 'info', icon: Loader2 },
  in_review: { labelKey: 'status.task.in_review', tone: 'warning', icon: CircleAlert },
  done: { labelKey: 'status.task.done', tone: 'success', icon: CircleCheck },
  canceled: { labelKey: 'status.task.canceled', tone: 'default', icon: CircleX },
};

/** 项目工作流状态五态（与任务五态同 tone 词表） */
export const PROJECT_WORKFLOW_VISUALS: Record<string, StatusVisual> = {
  backlog: { labelKey: 'status.project.backlog', tone: 'default', icon: CircleDashed },
  planned: { labelKey: 'status.project.planned', tone: 'warning', icon: CalendarClock },
  in_progress: { labelKey: 'status.project.in_progress', tone: 'info', icon: Loader2 },
  completed: { labelKey: 'status.project.completed', tone: 'success', icon: CircleCheck },
  canceled: { labelKey: 'status.project.canceled', tone: 'default', icon: CircleX },
};

/** 项目归档状态（active/archived） */
export const PROJECT_STATUS_VISUALS: Record<string, StatusVisual> = {
  active: { labelKey: 'status.project.active', tone: 'success', icon: Activity },
  archived: { labelKey: 'status.project.archived', tone: 'default', icon: Archive },
};

/** 项目健康度 */
export const HEALTH_VISUALS: Record<string, StatusVisual> = {
  on_track: { labelKey: 'status.health.on_track', tone: 'success', icon: CircleCheck },
  at_risk: { labelKey: 'status.health.at_risk', tone: 'warning', icon: CircleAlert },
  off_track: { labelKey: 'status.health.off_track', tone: 'danger', icon: CircleX },
};

/** 优先级（任务与项目共用；urgent 为项目侧叫法） */
export const PRIORITY_VISUALS: Record<string, StatusVisual> = {
  low: { labelKey: 'status.priority.low', tone: 'default', icon: ArrowDown },
  medium: { labelKey: 'status.priority.medium', tone: 'info', icon: Minus },
  high: { labelKey: 'status.priority.high', tone: 'warning', icon: ArrowUp },
  critical: { labelKey: 'status.priority.critical', tone: 'danger', icon: Flame },
  urgent: { labelKey: 'status.priority.urgent', tone: 'danger', icon: Flame },
};

/** 风险等级 */
export const RISK_VISUALS: Record<string, StatusVisual> = {
  low: { labelKey: 'status.risk.low', tone: 'default', icon: ArrowDown },
  medium: { labelKey: 'status.risk.medium', tone: 'info', icon: Minus },
  high: { labelKey: 'status.risk.high', tone: 'warning', icon: ArrowUp },
  critical: { labelKey: 'status.risk.critical', tone: 'danger', icon: Flame },
};
