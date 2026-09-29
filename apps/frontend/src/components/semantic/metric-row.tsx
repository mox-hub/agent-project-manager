import type * as React from "react"

import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

type MetricRowTone = "default" | "red" | "yellow" | "green" | "blue" | "purple" | "orange"

/**
 * tone → Progress indicator 色，沿用仓内既有手法（project-team-settings-panel /
 * settings models-tab 同款任意变体选择器），不新增着色机制；default 不覆盖，
 * 保留 ui/progress 基线 bg-primary。
 */
const TONE_INDICATOR_CLASS: Record<MetricRowTone, string> = {
  default: "",
  red: "[&_[data-slot=progress-indicator]]:bg-accent-red",
  yellow: "[&_[data-slot=progress-indicator]]:bg-accent-yellow",
  green: "[&_[data-slot=progress-indicator]]:bg-accent-green",
  blue: "[&_[data-slot=progress-indicator]]:bg-accent-blue",
  purple: "[&_[data-slot=progress-indicator]]:bg-accent-purple",
  orange: "[&_[data-slot=progress-indicator]]:bg-accent-orange",
}

/**
 * MetricRow —— 「label + 进度条 + 数值」单行指标（G 类 semantic 批二）
 *
 * analytics（ProfileHealthRow / 成本占比 share 列）、dashboard-page 面板、
 * team-stats-section 项目进度列等 8+ 处「dot/icon + label + Progress + value」行的
 * 唯一实现。形态取现用最常见写法：flex items-center gap-2 行，Progress flex-1，
 * 数值 `w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground`，
 * 百分号由本件统一补（现用处均为 `{n}%` 手拼）。
 *
 * **props 面封闭（裁决 G8，同 chip.tsx）**：不接 `className`、不透传 variant、
 * 不 extends HTMLAttributes。与立项 props 面的一处偏差：`label` 落为可选——抽象
 * 来源中表格进度列（team-stats 进度列 / analytics 成本占比 share 列）行内无 label
 * （label 在表格首列），必填会迫使调用方造假 label；以现用形态为准（同 StatTile
 * icon 类型偏差的裁决口径），label 缺省时行内只留 Progress + 数值。
 *
 * value/max 换算：显示与 Progress 值均为 `round(value/max*100)`（clamp 0-100），
 * max 默认 100（value 即百分数）；原始值/自定义文案用 `trailing` 槽位补充。
 */
function MetricRow({
  label,
  value,
  max = 100,
  tone = "default",
  trailing,
  icon,
}: {
  /** 行首标签（text-xs text-muted-foreground truncate；表格列内可缺省） */
  label?: React.ReactNode
  /** 指标值（按 value/max 换算为百分数，max 默认 100） */
  value: number
  /** 换算分母，默认 100 */
  max?: number
  /** 进度条语义色档，default 保留 ui/progress 基线 bg-primary */
  tone?: MetricRowTone
  /** 数值之后的尾部附加（如「3/12 槽位」式原文案） */
  trailing?: React.ReactNode
  /** 行首图标节点（如状态圆点 span，size 档由调用方给） */
  icon?: React.ReactNode
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0

  return (
    <div data-slot="metric-row" className="flex items-center gap-2">
      {icon}
      {label != null && (
        <span
          data-slot="metric-row-label"
          className="min-w-0 truncate text-xs text-muted-foreground"
        >
          {label}
        </span>
      )}
      <Progress value={pct} className={cn("flex-1", TONE_INDICATOR_CLASS[tone])} />
      <span
        data-slot="metric-row-value"
        className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground"
      >
        {pct}%
      </span>
      {trailing}
    </div>
  )
}

export { MetricRow }
export type { MetricRowTone }
