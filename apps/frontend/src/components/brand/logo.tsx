import { cn } from '@/lib/utils'

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl'

/**
 * `plain` — 原始图形：核心环 + 轨道 + 两端对称节点 + 中心点
 * `framed` — 在 plain 外加一圈圆角矩形容器（登录页主标识 / 强调场景）
 *
 * 设计语义：Ordo（拉丁语「秩序」）—— 有序轨道系统
 * - 核心环：秩序中枢（工程治理核心，stroke-only 让轨道在核心内仍可见）
 * - 椭圆轨道：编排轨道（AI 执行面围绕核心有序运转；尺度 > 核心环，形成"土星环"形态）
 * - 两端对称节点：人与 AI 同事——同一套秩序里的两个主体，各居轨道一端、关于中心对置
 * - 中心点：共同焦点（位于轨道几何中心，被轨道穿过）
 *
 * 视觉语言：「秩序」由**规则闭合的椭圆 + 两节点关于中心 180° 对置**表达——
 * 对置即平衡，是图形层面的"有序"信号，而非依赖具象装饰。
 */
export type LogoVariant = 'plain' | 'framed'

/**
 * `auto` 跟随主题 primary 色（推荐）
 * `light` 强制白底深纹（深色背景下使用）
 * `dark`  强制深底白纹（浅色背景下使用）
 */
export type LogoTone = 'auto' | 'light' | 'dark'

export interface LogoProps {
  size?: LogoSize
  variant?: LogoVariant
  tone?: LogoTone
  className?: string
  withWordmark?: boolean
  ariaLabel?: string
}

const SIZE_MAP: Record<LogoSize, number> = {
  sm: 24,
  md: 32,
  lg: 40,
  xl: 72,
}

const TEXT_SIZE_MAP: Record<LogoSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
}

export function Logo({
  size = 'md',
  variant = 'plain',
  tone = 'auto',
  className,
  withWordmark = false,
  ariaLabel = 'Ordo',
}: LogoProps) {
  const px = SIZE_MAP[size]

  // 调色板：auto 根据系统主题决策，确保 bg/fg 永远对比
  // prefers-color-scheme: dark -> bg=深色/fg=白色（夜间模式）
  // prefers-color-scheme: light / 无匹配 -> bg=白色/fg=深色（白天模式）
  const prefersDark = () =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false

  const palette =
    tone === 'light'
      ? { bg: '#FFFFFF', fg: '#0A0A0A' }
      : tone === 'dark'
        ? { bg: '#0A0A0A', fg: '#FFFFFF' }
        : prefersDark()
          ? { bg: '#0A0A0A', fg: '#FFFFFF' }
          : { bg: '#FFFFFF', fg: '#0A0A0A' }

  // framed 模式预留 padding，整体画布尺寸与中心
  const viewBoxSize = variant === 'framed' ? 244 : 220
  const cx = viewBoxSize / 2
  const cy = viewBoxSize / 2

  // 几何参数：与 public/logo.svg 同步
  const frameInset = variant === 'framed' ? 12 : 0
  const frameSize = variant === 'framed' ? viewBoxSize - frameInset * 2 : 0
  const frameR = 54
  const coreR = 70 // 核心环半径
  const orbitRx = variant === 'framed' ? 110 : 115
  const orbitRy = variant === 'framed' ? 40 : 38
  const ringStroke = variant === 'framed' ? 3.8 : 3.5
  const coreStroke = 3

  // 轨道两端对称节点：椭圆经 rotate(-30°) 后，参数 t=20° / t=200° 两点关于中心点对置。
  // plain(c=110, rx=115, ry=38)  -> (210.1, 67.2) / (9.9, 152.8)
  // framed(c=122, rx=110, ry=40) -> (218.4, 82.2) / (25.6, 161.8)
  const nodeR = variant === 'framed' ? 9 : 8
  const nodeAX = variant === 'framed' ? 218 : 210
  const nodeAY = variant === 'framed' ? 82 : 67
  const nodeBX = variant === 'framed' ? 26 : 10
  const nodeBY = variant === 'framed' ? 162 : 153

  const centerR = variant === 'framed' ? 14 : 13

  return (
    <div
      className={cn('inline-flex items-center gap-2', className)}
      role="img"
      aria-label={ariaLabel}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        width={px}
        height={px}
        className="shrink-0"
        aria-hidden="true">
        {/* framed: 圆角矩形容器（主色填充，图形反色） */}
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

        {/* 椭圆轨道：编排轨道。scale > 核心环，形成"土星环" */}
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

        {/* 核心环：秩序中枢，stroke-only 让轨道在核心内仍可见 */}
        <circle
          cx={cx}
          cy={cy}
          r={coreR}
          fill="none"
          stroke={palette.fg}
          strokeWidth={coreStroke}
        />

        {/* 轨道两端对称节点：人与 AI 同事（关于中心对置） */}
        <circle cx={nodeAX} cy={nodeAY} r={nodeR} fill={palette.fg} />
        <circle cx={nodeBX} cy={nodeBY} r={nodeR} fill={palette.fg} />

        {/* 中心焦点：位于轨道几何中心 */}
        <circle cx={cx} cy={cy} r={centerR} fill={palette.fg} />
      </svg>

      {withWordmark && (
        <span
          className={cn(
            'font-semibold text-foreground tracking-wide',
            TEXT_SIZE_MAP[size],
          )}>
          Ordo
        </span>
      )}
    </div>
  )
}

export default Logo
