import { X } from "lucide-react"
import type * as React from "react"

import { RawButton } from "@/components/raw/raw-button"
import { cn } from "@/lib/utils"

type ChipTone = "default" | "danger" | "primary"
type ChipShape = "pill" | "soft"

const TONE_CLASS: Record<ChipTone, { base: string; remove: string }> = {
  default: {
    base: "border-border text-content-text-secondary hover:bg-muted/50 hover:text-foreground",
    remove: "hover:text-destructive",
  },
  danger: {
    base: "border-border text-content-text-secondary hover:border-accent-red/40 hover:bg-accent-red-light hover:text-accent-red",
    remove: "hover:text-destructive",
  },
  primary: {
    base: "border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary",
    remove: "hover:text-destructive",
  },
}

const SHAPE_CLASS: Record<ChipShape, string> = {
  pill: "rounded-full px-2.5 py-1",
  soft: "rounded-md px-2 py-0.5",
}

const CHIP_BASE =
  "inline-flex shrink-0 items-center gap-1 border bg-background text-xs font-normal whitespace-nowrap transition-colors"

/**
 * Chip —— 语义组件层首件（G 类批 G1；G5 裁决示范组件，自 stash 留档复活）
 *
 * 标签 / 胶囊 / 可关闭标签的唯一实现：可关闭标签、驳回原因 chips、过滤器 tag、
 * 计数胶囊等形态的唯一真相源，业务面不再为标签形态裸写 button。
 *
 * **raw vs ui 边界判例一（G8 落点，后续语义组件照此裁断）**：
 * - 「容器可点击」的展示件不是动作钮——可点击语义用 `RawButton` 承载（button 元素
 *   可达性 + `type="button"` 防表单误提交），**刻意不用 `<Button>`**：chip 不参与
 *   §4.5 动作钮形态收敛，换 Button 会把它卷进 variant/size 轴。
 * - 尾部 × 关闭钮同理走 `RawButton`（删除的是 chip 自身，非页面动作钮）。
 * - 纯展示态（无 onClick 且无 onRemove）用 `span`。
 *
 * **props 面封闭（G8 裁决口径，本组件即首例）**：显式声明 props，不接 `className`
 * （形态内聚，不留样式透传口子）、不透传 variant、不 extends HTMLAttributes。
 * 复核记录：stash 原实现曾接 className，批 G1 复核时按 G8 摘除。
 *
 * 形态：
 * - `shape="pill"`（默认）胶囊——动作 chips / 计数胶囊；`shape="soft"` 小圆角——标签 tag。
 * - `tone` 控制悬停语义色：`danger` 悬停转红（驳回原因 chips）、`primary` 悬停转主色
 *   （Add tag，dashed 虚线框）。
 */
function Chip({
  tone = "default",
  shape = "pill",
  onClick,
  onRemove,
  disabled,
  icon,
  children,
}: {
  /** 悬停语义色：default 中性 / danger 悬停转红 / primary 悬停转主色（dashed 虚线框） */
  tone?: ChipTone
  /** pill 胶囊（动作 chips / 计数胶囊）| soft 小圆角（标签 tag） */
  shape?: ChipShape
  /** 可点击语义（内部 RawButton 承载；不传且无 onRemove 时为 span 展示） */
  onClick?: () => void
  /** 传入则渲染尾部 × 关闭钮 */
  onRemove?: () => void
  disabled?: boolean
  icon?: React.ReactNode
  children?: React.ReactNode
}) {
  const t = TONE_CLASS[tone]
  const interactive = Boolean(onClick)

  const removeButton = onRemove ? (
    <RawButton
      aria-label="移除"
      disabled={disabled}
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation()
              onRemove()
            }
          : onRemove
      }
      className={cn("ml-0.5 rounded-full transition-colors", t.remove)}
    >
      <X className="size-2.5" />
    </RawButton>
  ) : null

  if (!interactive) {
    return (
      <span
        className={cn(
          CHIP_BASE,
          SHAPE_CLASS[shape],
          t.base,
          disabled && "pointer-events-none opacity-40",
        )}
      >
        {icon}
        {children}
        {removeButton}
      </span>
    )
  }

  return (
    <RawButton
      disabled={disabled}
      onClick={onClick}
      className={cn(
        CHIP_BASE,
        SHAPE_CLASS[shape],
        t.base,
        disabled && "pointer-events-none opacity-40",
      )}
    >
      {icon}
      {children}
      {removeButton}
    </RawButton>
  )
}

export { Chip }
export type { ChipTone, ChipShape }
