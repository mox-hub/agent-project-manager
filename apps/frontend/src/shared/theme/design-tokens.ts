/**
 * Figma Design System v23 - 颜色和样式令牌
 * 提供一致的样式规范和辅助函数
 */

import type { ThemeColors } from './theme';

// 优先级颜色配置
export const PRIORITY_COLORS = {
  LOW: { text: 'text-slate-600', bg: 'bg-slate-400', hex: '#94a3b8' },
  MEDIUM: { text: 'text-blue-600', bg: 'bg-blue-500', hex: '#3b82f6' },
  HIGH: { text: 'text-orange-600', bg: 'bg-orange-500', hex: '#f97316' },
  URGENT: { text: 'text-red-600', bg: 'bg-red-500', hex: '#ef4444' },
} as const;

export type PriorityLevel = keyof typeof PRIORITY_COLORS;

// 严重性颜色配置 (Bug)
export const SEVERITY_COLORS = {
  CRITICAL: { hex: '#ef4444', textClass: 'text-red-500', bgClass: 'bg-red-500' },
  HIGH: { hex: '#f97316', textClass: 'text-orange-500', bgClass: 'bg-orange-500' },
  MEDIUM: { hex: '#f59e0b', textClass: 'text-amber-500', bgClass: 'bg-amber-500' },
  LOW: { hex: '#94a3b8', textClass: 'text-slate-400', bgClass: 'bg-slate-400' },
} as const;

export type SeverityLevel = keyof typeof SEVERITY_COLORS;

// 状态颜色配置
export const STATUS_COLORS = {
  BACKLOG: { hex: '#64748b', textClass: 'text-slate-500' },
  TODO: { hex: '#64748b', textClass: 'text-slate-500' },
  IN_PROGRESS: { hex: '#3b82f6', textClass: 'text-blue-500' },
  IN_REVIEW: { hex: '#f59e0b', textClass: 'text-amber-500' },
  BLOCKED: { hex: '#ef4444', textClass: 'text-red-500' },
  DONE: { hex: '#22c55e', textClass: 'text-emerald-500' },
  CANCELED: { hex: '#94a3b8', textClass: 'text-slate-400' },
} as const;

export type TaskStatusLevel = keyof typeof STATUS_COLORS;

// AI 管理颜色
export const AI_COLORS = {
  CONNECTED: '#10b981',
  ACTIVE: '#3b82f6',
  SKILLS: '#7c3aed',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
} as const;

// 间距规范 (Figma)
export const SPACING = {
  ICON_CONTAINER: 'w-9 h-9',      // 图标容器
  ICON_SIZE: 'w-5 h-5',           // 图标大小
  PAGE_PADDING_X: 'px-6',         // 页面水平内边距
  PAGE_PADDING_Y: 'py-4',         // 页面垂直内边距
  CARD_PADDING: 'p-3',            // 卡片内边距
  DIALOG_WIDTH_SM: 'max-w-md',     // 小对话框
  DIALOG_WIDTH_MD: 'max-w-lg',    // 中对话框
  DIALOG_WIDTH_LG: 'max-w-2xl',   // 大对话框
  DIALOG_WIDTH_XL: 'max-w-3xl',   // 超大对话框
  KANBAN_COLUMN: 'w-80',          // 看板列宽
  POPOVER_WIDTH: 'w-80',          // 弹出框宽度
  PICKER_WIDTH: 'w-56',           // 选择器宽度
} as const;

// 看板卡片样式 (与 ProjectBoard 一致)
export const KANBAN_CARD_STYLES = {
  default: 'bg-card border border-border rounded-lg p-3 cursor-pointer transition-all group',
  hover: 'hover:border-ring/50 hover:shadow-sm',
} as const;

// 列表视图样式
export const LIST_VIEW_STYLES = {
  grid: 'grid-cols-[auto_100px_1fr_140px_100px_120px_100px_40px]',
  headerBg: 'bg-muted/50',
  rowHover: 'hover:bg-accent/30',
} as const;

// Bug 列表视图样式
export const BUG_LIST_VIEW_STYLES = {
  grid: 'grid-cols-[4px_auto_100px_1fr_140px_100px_120px_40px]',
  severityBarWidth: 'w-[4px]',
} as const;

// 辅助函数：获取优先级样式
export function getPriorityColor(priority: PriorityLevel) {
  return PRIORITY_COLORS[priority] || PRIORITY_COLORS.MEDIUM;
}

// 辅助函数：获取严重性样式
export function getSeverityColor(severity: SeverityLevel) {
  return SEVERITY_COLORS[severity] || SEVERITY_COLORS.MEDIUM;
}

// 辅助函数：获取状态样式
export function getStatusColor(status: TaskStatusLevel) {
  return STATUS_COLORS[status] || STATUS_COLORS.TODO;
}

// 辅助函数：判断是否逾期
export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < Date.now();
}

// 辅助函数：格式化相对时间
export function formatRelativeTime(date: string): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const hours = Math.floor(diff / 3600000);

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// 辅助函数：获取 TeamMember 颜色用于头像
export function getMemberColor(member: { color?: string } | null | undefined): string {
  return member?.color || '#666666';
}

// 状态选项
export const TASK_STATUS_OPTIONS = [
  { value: 'BACKLOG', label: 'Backlog' },
  { value: 'TODO', label: 'Todo' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'DONE', label: 'Done' },
  { value: 'CANCELED', label: 'Canceled' },
] as const;

// 优先级选项
export const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
] as const;
