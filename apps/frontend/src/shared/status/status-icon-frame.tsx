/**
 * StatusIconFrame - 状态图标底框
 *
 * 统一的「带底框状态图标」：tone 语义浅底 + 圆角方框 + 居中图标。
 * 消费方：任务/BUG 详情标题、子任务行、Activity 时间线事件图标。
 * tone 与图标取值来自 ./status-visuals（唯一映射源）。
 */
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TONE_LIGHT_CLASS, type StatusTone } from './status-visuals';

const FRAME_SIZES = {
  xs: { frame: 'size-4 rounded-xs', icon: 'size-2.5' },
  sm: { frame: 'size-5 rounded-xs', icon: 'size-3' },
  md: { frame: 'size-6 rounded-md', icon: 'size-3.5' },
  /** 标题档：内图 18px 与 text-lg 标题字号一致，外框 28px（=标题行高）自然包裹 */
  lg: { frame: 'size-7 rounded-md', icon: 'size-4.5' },
} as const;

export type StatusIconFrameSize = keyof typeof FRAME_SIZES;

export function StatusIconFrame({
  icon: Icon,
  tone,
  size = 'md',
  spin = false,
  className,
  iconClassName,
}: {
  icon: LucideIcon;
  tone: StatusTone;
  size?: StatusIconFrameSize;
  /** in_progress 等旋转图标需要自旋（Loader2） */
  spin?: boolean;
  className?: string;
  iconClassName?: string;
}) {
  const sizes = FRAME_SIZES[size];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        sizes.frame,
        TONE_LIGHT_CLASS[tone],
        className,
      )}
    >
      <Icon
        className={cn(sizes.icon, spin && 'animate-spin', iconClassName)}
      />
    </span>
  );
}
