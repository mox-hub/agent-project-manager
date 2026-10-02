/**
 * StatusIconFrame - 状态图标底框
 *
 * 统一的「带底框状态图标」：tone 语义浅底 + 圆角方框 + 居中图标。
 * 消费方：任务/BUG 详情标题、子任务行、Activity 时间线事件图标。
 * tone 与图标取值来自 ./status-visuals（唯一映射源）。
 */
import { cn } from '@/lib/utils';
import { TONE_LIGHT_CLASS, type StatusIconComponent, type StatusTone } from './status-visuals';

const FRAME_SIZES = {
  /** xs/sm 外框为正圆形，list/md/lg/xl 为圆角方框；各档图标均按「内边距 2px」撑满外框 */
  xs: { frame: 'size-4 rounded-full', icon: 'size-3' },
  sm: { frame: 'size-5 rounded-full', icon: 'size-4' },
  /** Task Atoms 列表行标准芯片（22×22，StatusChip 同规）——任务/BUG 列表行首统一档 */
  list: { frame: 'size-5.5 rounded-md', icon: 'size-4.5' },
  md: { frame: 'size-6 rounded-md', icon: 'size-5' },
  lg: { frame: 'size-7 rounded-md', icon: 'size-6' },
  /** 双行文本行专用档（32×32）——设置·状态等「图标 + 名称/描述两行」行首场景。
   *  验收口径（2026-10-01）：大档**放大底框为主，图标适度**（20px，内边距 6px），
   *  不沿用小档「图标撑满外框」规律——大框撑满图标会导致视觉重心失衡。 */
  xl: { frame: 'size-8 rounded-lg', icon: 'size-5' },
} as const;

export type StatusIconFrameSize = keyof typeof FRAME_SIZES;

/** 状态图标线宽基线（lucide 缺省 2 小尺寸下偏细；规范见 status-visuals.ts STATUS_ICONS 头注） */
const STROKE_WIDTH = 2.5;

/** 自定义色浅底 alpha（推荐类型行同款先例：`${hex}1A` ≈ 10% 底 + 同色前景） */
const COLOR_SURFACE_ALPHA = '1A';

/** 6 位 hex 追加 alpha；非法/短格式返回 null（回落 tone 浅底） */
export function hexWithAlpha(color: string, alpha: string): string | null {
  return /^[0-9a-fA-F]{6}$/.test(color.slice(1)) ? `${color}${alpha}` : null;
}

export function StatusIconFrame({
  icon: Icon,
  tone,
  size = 'md',
  spin = false,
  title,
  color,
  colorSurface = false,
  className,
  iconClassName,
}: {
  icon: StatusIconComponent;
  tone: StatusTone;
  size?: StatusIconFrameSize;
  /** in_progress 等旋转图标需要自旋（Loader2） */
  spin?: boolean;
  /** 悬停提示（状态名等），透传原生 title */
  title?: string;
  /** 自定义前景色（StatusDefinition.color 落库值）；浅底框仍按 tone，仅图标着色覆盖 */
  color?: string;
  /** 浅底跟随自定义色（`${color}1A`）而非 tone 浅底——设置·状态等自定义色管理场景 */
  colorSurface?: boolean;
  className?: string;
  iconClassName?: string;
}) {
  const sizes = FRAME_SIZES[size];
  const surfaceStyle =
    colorSurface && color ? { backgroundColor: hexWithAlpha(color, COLOR_SURFACE_ALPHA) } : undefined;
  return (
    <span
      title={title}
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        sizes.frame,
        !surfaceStyle && TONE_LIGHT_CLASS[tone],
        className,
      )}
      style={surfaceStyle}
    >
      <Icon
        strokeWidth={STROKE_WIDTH}
        style={color ? { color } : undefined}
        className={cn(sizes.icon, spin && 'animate-spin', iconClassName)}
      />
    </span>
  );
}
