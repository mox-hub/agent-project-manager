import { cn } from '@/lib/utils';

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * `plain` — 原始图形：圆 + 轨道环 + 中心点 + 外环电子
 * `framed` — 在 plain 外加一圈圆角矩形容器（登录页主标识 / 强调场景）
 *
 * 设计语义：原子 + 土星环 + 电子 — 表达 AI 驱动的协作
 * - 主圆：原子核（核心控制面，stroke-only 让环贯穿可见）
 * - 椭圆环：执行轨道（AI 执行面围绕核心运转；尺度 > 主圆，形成"土星环"形态）
 * - 中心点：当前焦点（位于环的几何中心，被环穿过圆心）
 * - 右上环上电子：状态信号 / 触发节点（位置贴合椭圆右上段环带）
 */
export type LogoVariant = 'plain' | 'framed';

/**
 * `auto` 跟随主题 primary 色（推荐）
 * `light` 强制白底深纹（深色背景下使用）
 * `dark`  强制深底白纹（浅色背景下使用）
 */
export type LogoTone = 'auto' | 'light' | 'dark';

export interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  tone?: LogoTone;
  className?: string;
  withWordmark?: boolean;
  ariaLabel?: string;
}

const SIZE_MAP: Record<LogoSize, number> = {
  sm: 24,
  md: 32,
  lg: 40,
  xl: 72,
};

const TEXT_SIZE_MAP: Record<LogoSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

export function Logo({
  size = 'md',
  variant = 'plain',
  tone = 'auto',
  className,
  withWordmark = false,
  ariaLabel = 'Agent Project Manager',
}: LogoProps) {
  const px = SIZE_MAP[size];

  // 调色板：auto 根据系统主题决策，确保 bg/fg 永远对比
  // prefers-color-scheme: dark -> bg=深色/fg=白色（夜间模式）
  // prefers-color-scheme: light / 无匹配 -> bg=白色/fg=深色（白天模式）
  const prefersDark = () =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;

  const palette =
    tone === 'light'
      ? { bg: '#FFFFFF', fg: '#0A0A0A' }
      : tone === 'dark'
        ? { bg: '#0A0A0A', fg: '#FFFFFF' }
        : prefersDark()
          ? { bg: '#0A0A0A', fg: '#FFFFFF' }
          : { bg: '#FFFFFF', fg: '#0A0A0A' };

  // framed 模式预留 padding，整体画布尺寸与中心
  const viewBoxSize = variant === 'framed' ? 244 : 220;
  const cx = viewBoxSize / 2;
  const cy = viewBoxSize / 2;

  // 几何参数：与 public/logo.svg 同步
  const frameInset = variant === 'framed' ? 12 : 0;
  const frameSize = variant === 'framed' ? viewBoxSize - frameInset * 2 : 0;
  const frameR = 54;
  const coreR = 70; // 主圆半径
  const orbitRx = variant === 'framed' ? 110 : 115;
  const orbitRy = variant === 'framed' ? 40 : 38;
  const ringStroke = variant === 'framed' ? 3.8 : 3.5;
  const coreStroke = 3;

  // 外环电子：旋转 -30° 后椭圆右上段（参数 t≈20°）。
  // plain(c=110, rx=115, ry=38) -> (210.1, 67.2)
  // framed(c=122, rx=110, ry=40) -> (218.3, 82.2)
  const electronR = variant === 'framed' ? 9 : 8;
  const electronX = variant === 'framed' ? 218 : 210;
  const electronY = variant === 'framed' ? 82 : 67;

  const centerR = variant === 'framed' ? 14 : 13;

  return (
    <div
      className={cn('inline-flex items-center gap-2', className)}
      role="img"
      aria-label={ariaLabel}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        width={px}
        height={px}
        className="shrink-0"
        aria-hidden="true"
      >
        {/* framed: 圆角矩形容器（主色填充，原子图形反色） */}
        {variant === 'framed' && (
          <rect
            x={frameInset}
            y={frameInset}
            width={frameSize}
            height={frameSize}
            rx={frameR}
            fill={palette.bg}
          />
        )}

        {/* 椭圆环：执行轨道。scale > 主圆，形成土星环。
            plain: fg 色 stroke（深色背景下）；framed: fg 色 stroke（在 bg 容器上） */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={orbitRx}
          ry={orbitRy}
          fill="none"
          stroke={palette.fg}
          strokeWidth={ringStroke}
          transform={`rotate(-30 ${cx} ${cy})`}
        />

        {/* 主圆：原子核，stroke-only 让环在主圆内仍可见 */}
        <circle
          cx={cx}
          cy={cy}
          r={coreR}
          fill="none"
          stroke={palette.fg}
          strokeWidth={coreStroke}
        />

        {/* 外环电子：贴合右上段环带 */}
        <circle
          cx={electronX}
          cy={electronY}
          r={electronR}
          fill={palette.fg}
        />

        {/* 中心焦点：位于环的几何中心 */}
        <circle
          cx={cx}
          cy={cy}
          r={centerR}
          fill={palette.fg}
        />
      </svg>

      {withWordmark && (
        <span
          className={cn(
            'font-semibold text-foreground tracking-wide',
            TEXT_SIZE_MAP[size],
          )}
        >
          AgentPM
        </span>
      )}
    </div>
  );
}

export default Logo;
