import type { ReactNode } from "react"

import { ChartLegendGrid, SERIES_COLORS } from "@/components/semantic/chart-legend-grid"
import { formatPercent } from "@/lib/format"

/**
 * ProportionBar —— 分段比例条（语义层，2026-10-11 图表重设计批）
 *
 * 「全宽分段条 + 斜纹余量 + 图例网格」一体件：各段按占比横向拼接，总量大于各段
 * 合计时余量以斜纹（repeating-linear-gradient + border token，无字面色）呈现。
 * 段色序走 SERIES_COLORS（§17.2 序列顺序即色序）。纯 div 实现，不进坐标系。
 *
 * props 面封闭（G8）：不接 className、不透传样式。总量为 0（无数据）不渲染空条
 * （§17.5 精神）：传 `empty` 槽位则渲染之，否则渲染 null。
 */
export interface ProportionBarSegment {
  /** 唯一标识 */
  key: string
  /** 段名（图例） */
  label: ReactNode
  /** 数值（正数；0 段不画） */
  value: number
}

export function ProportionBar({
  segments,
  total,
  formatValue = (value) => value.toLocaleString(),
  legend = true,
  legendColumns = 2,
  empty,
  ariaLabel,
}: {
  segments: ProportionBarSegment[]
  /** 总量（分母；缺省 = 各段合计。大于合计时余量以斜纹呈现） */
  total?: number
  /** 数值格式化（图例用） */
  formatValue?: (value: number) => string
  /** 是否渲染图例网格（默认 true） */
  legend?: boolean
  /** 图例列数（默认 2） */
  legendColumns?: 1 | 2 | 3
  /** 总量为 0 时的空态槽位（调用方传本地化节点；缺省渲染 null） */
  empty?: ReactNode
  /** 图表结论（role=img 的 aria-label，宪法 §17.6） */
  ariaLabel?: string
}) {
  const sum = segments.reduce((acc, segment) => acc + segment.value, 0)
  const denom = total ?? sum
  if (denom <= 0) return <>{empty ?? null}</>

  const filled = segments.map((segment, index) => ({
    ...segment,
    color: SERIES_COLORS[index % SERIES_COLORS.length],
    pct: Math.max(segment.value / denom, 0),
  }))
  const remainderPct = Math.min(Math.max(1 - filled.reduce((acc, s) => acc + s.pct, 0), 0), 1)

  return (
    <div
      data-slot="proportion-bar"
      className="w-full space-y-2.5"
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
    >
      <div aria-hidden className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
        {filled.map((segment) =>
          segment.pct > 0 ? (
            <div
              key={segment.key}
              className="h-full"
              style={{ width: `${segment.pct * 100}%`, backgroundColor: segment.color }}
            />
          ) : null,
        )}
        {remainderPct > 0 && (
          <div
            className="h-full flex-1"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, hsl(var(--border)) 0 1px, transparent 1px 4px)",
            }}
          />
        )}
      </div>
      {legend && (
        <ChartLegendGrid
          items={filled.map((segment) => ({
            key: segment.key,
            label: segment.label,
            color: segment.color,
            value: segment.value > 0 ? formatValue(segment.value) : undefined,
            percentage: formatPercent(segment.pct),
          }))}
          columns={legendColumns}
        />
      )}
    </div>
  )
}
