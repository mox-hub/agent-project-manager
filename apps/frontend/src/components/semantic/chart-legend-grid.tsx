import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * ChartLegendGrid —— 图表图例网格（语义层，2026-10-11 图表重设计批）
 *
 * 「色点 + 标签 + 数值 + 占比」四段式图例项的多列网格。donut-chart /
 * proportion-bar 内建消费，也可独立用于任何分段着色图。
 *
 * 色值只收**语义 token 引用字符串**（`hsl(var(--chart-1))` 等）——§5.1 禁字面色，
 * 内联 style 写 var() 引用不触 check-palette 的字面量谓词；系列色序由调用方按
 * §17.2「序列顺序即色序」经 SERIES_COLORS 分配。
 *
 * props 面封闭（G8）：不接 className、不透传样式。
 */

/** 图表系列色序（§17.2：只用 --chart-1..5，序列顺序即色序，不得跨图乱序） */
export const SERIES_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
] as const

export interface ChartLegendGridItem {
  /** 唯一标识 */
  key: string
  /** 系列名（truncate） */
  label: ReactNode
  /** 系列色：语义 token 引用（SERIES_COLORS 取值），禁字面色 */
  color: string
  /** 数值（font-mono tabular-nums） */
  value?: ReactNode
  /** 占比（弱化右对齐） */
  percentage?: ReactNode
}

const GRID_CLASS = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" } as const

export function ChartLegendGrid({
  items,
  columns = 2,
}: {
  items: ChartLegendGridItem[]
  /** 列数（默认 2） */
  columns?: 1 | 2 | 3
}) {
  if (items.length === 0) return null
  return (
    <div
      data-slot="chart-legend-grid"
      className={cn("grid items-center gap-x-4 gap-y-1.5", GRID_CLASS[columns])}
    >
      {items.map((item) => (
        <div
          key={item.key}
          data-slot="chart-legend-grid-item"
          className="flex min-w-0 items-center gap-1.5"
        >
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-xs"
            style={{ backgroundColor: item.color }}
          />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
            {item.label}
          </span>
          {item.value != null && (
            <span className="shrink-0 font-mono text-xs tabular-nums text-foreground">
              {item.value}
            </span>
          )}
          {item.percentage != null && (
            <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {item.percentage}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
