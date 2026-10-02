/**
 * 发版状态视觉元信息（CAP-K-03 批三从 release-list-page 抽出）：
 * 列表页/详情页/即将发版区三方共用，避免「组件 → 页面」循环导入。
 * 行首图标与任务列表 StatusIconFrame 同构；tone 色系与状态胶囊一致。
 */
import {
  Loader2,
  Rocket,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleX,
  type LucideIcon,
} from 'lucide-react';
import type { StatusTone } from '@/shared/status/status-visuals';
import type { ReleaseStatus } from './api/release-api';

/** 发版状态 → 行内胶囊 tone（详情页 SubPageToolbar 徽章沿用） */
export const RELEASE_STATUS_TONE: Record<ReleaseStatus, string> = {
  draft: 'bg-muted/50 text-muted-foreground',
  gated: 'bg-accent-yellow-light text-accent-yellow',
  approved: 'bg-accent-blue-light text-accent-blue',
  publishing: 'bg-accent-yellow-light text-accent-yellow animate-pulse',
  released: 'bg-accent-green-light text-accent-green',
  failed: 'bg-accent-red-light text-accent-red',
};

/** 发版状态 → 行首图标/tone */
export const RELEASE_STATUS_VISUALS: Record<
  ReleaseStatus,
  { icon: LucideIcon; tone: StatusTone }
> = {
  draft: { icon: CircleDashed, tone: 'default' },
  gated: { icon: CircleAlert, tone: 'warning' },
  approved: { icon: CircleCheck, tone: 'info' },
  publishing: { icon: Loader2, tone: 'warning' },
  released: { icon: Rocket, tone: 'success' },
  failed: { icon: CircleX, tone: 'danger' },
};

export const RELEASE_STATUSES = Object.keys(RELEASE_STATUS_TONE) as ReleaseStatus[];

export function statusLabelKey(status: ReleaseStatus): string {
  return `release.status.${status}`;
}

/** 未发布且计划时间已过的行，计划日期标红（已发布/失败不追诉） */
export function isPlannedOverdue(r: {
  status: ReleaseStatus;
  plannedAt?: string | null;
}): boolean {
  if (!r.plannedAt || r.status === 'released' || r.status === 'failed')
    return false;
  const planned = new Date(r.plannedAt);
  if (isNaN(planned.getTime())) return false;
  return planned.getTime() < new Date().setHours(0, 0, 0, 0);
}
