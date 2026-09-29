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
  /** xs/sm 外框为正圆形，list/md/lg 为圆角方框；各档图标均按「内边距 2px」撑满外框 */
  xs: { frame: 'size-4 rounded-full', icon: 'size-3' },
  sm: { frame: 'size-5 rounded-full', icon: 'size-4' },
  /** Task Atoms 列表行标准芯片（22×22，StatusChip 同规）——任务/BUG 列表行首统一档 */
  list: { frame: 'size-5.5 rounded-md', icon: 'size-4.5' },
  md: { frame: 'size-6 rounded-md', icon: 'size-5' },
  lg: { frame: 'size-7 rounded-md', icon: 'size-6' },
} as const;

export type StatusIconFrameSize = keyof typeof FRAME_SIZES;

export function StatusIconFrame({
  icon: Icon,
  tone,
  size = 'md',
  spin = false,
  title,
  className,
  iconClassName,
}: {
  icon: LucideIcon;
  tone: StatusTone;
  size?: StatusIconFrameSize;
  /** in_progress 等旋转图标需要自旋（Loader2） */
  spin?: boolean;
  /** 悬停提示（状态名等），透传原生 title */
  title?: string;
  className?: string;
  iconClassName?: string;
}) {
  const sizes = FRAME_SIZES[size];
  return (
    <span
      title={title}
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
