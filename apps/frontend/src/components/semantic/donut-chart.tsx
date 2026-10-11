import type { ReactNode } from "react"
import { Pie, PieChart } from "recharts"

import { ChartLegendGrid, SERIES_COLORS } from "@/components/semantic/chart-legend-grid"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * DonutChart —— 环形占比图（语义层，2026-10-11 图表重设计批）
 *
 * 「细环 donut + 中心总计 + 图例网格」一体件：ChartContainer + recharts PieChart
 * （ui/chart 唯一封装，§17.1），环心 absolute 叠放总计数值，右侧（或下方随布局）
 * ChartLegendGrid。色序走 SERIES_COLORS（§17.2 序列顺序即色序）。
 *
 * props 面封闭（G8）：不接 className、不透传样式。空数据（合计为 0）不渲染空白
 * 坐标系（§17.5）：传 `empty` 槽位则渲染之，否则渲染 null。
 */
export interface DonutChartItem {
  /** 唯一标识（同时作 recharts nameKey） */
  key: string
  /** 系列名（tooltip 与图例） */
  label: ReactNode
  /** 数值（正数；0 项不画扇区） */
  value: number
}

/** 环径档：sm = size-28（卡内紧凑）/ md = size-40（默认） */
const SIZE_CLASS = { sm: "size-28", md: "size-40" } as const

export function DonutChart({
  items,
  total,
  totalLabel,
  formatValue = (value) => value.toLocaleString(),
  legend = true,
  legendColumns = 2,
  size = "md",
  empty,
  ariaLabel,
}: {
  items: DonutChartItem[]
  /** 中心主数值（已格式化节点；缺省 = 各项合计走 formatValue） */
  total?: ReactNode
  /** 中心标签（总计下方弱化行，如「合计」） */
  totalLabel?: ReactNode
  /** 数值格式化（图例与 tooltip 共用） */
  formatValue?: (value: number) => string
  /** 是否渲染图例网格（默认 true） */
  legend?: boolean
  /** 图例列数（默认 2） */
  legendColumns?: 1 | 2 | 3
  /** 环径档（默认 md） */
  size?: "sm" | "md"
  /** 合计为 0 时的空态槽位（调用方传本地化 EmptyState；缺省渲染 null） */
  empty?: ReactNode
  /** 图表结论（role=img 的 aria-label，宪法 §17.6） */
  ariaLabel?: string
}) {
  const sum = items.reduce((acc, item) => acc + item.value, 0)
  if (sum <= 0) return <>{empty ?? null}</>

  const config: ChartConfig = Object.fromEntries(
    items.map((item) => [item.key, { label: item.label }]),
  )
  const data = items.map((item, index) => ({
    key: item.key,
    value: item.value,
    fill: SERIES_COLORS[index % SERIES_COLORS.length],
  }))
  const legendItems = items.map((item, index) => ({
    key: item.key,
    label: item.label,
    color: SERIES_COLORS[index % SERIES_COLORS.length],
    value: item.value > 0 ? formatValue(item.value) : undefined,
    percentage: formatPercent(item.value / sum),
  }))

  return (
    <div data-slot="donut-chart" className="flex w-full items-center gap-4">
      <div
        className={cn("relative shrink-0", SIZE_CLASS[size])}
        role={ariaLabel ? "img" : undefined}
        aria-label={ariaLabel}
      >
        <ChartContainer config={config} className="h-full w-full">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent hideLabel formatter={(value) => formatValue(Number(value))} />
              }
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="key"
              innerRadius="72%"
              outerRadius="98%"
              paddingAngle={2}
              cornerRadius={3}
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
            />
          </PieChart>
        </ChartContainer>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        >
          <span className="font-mono text-xl font-semibold tabular-nums leading-tight text-foreground">
            {total ?? formatValue(sum)}
          </span>
          {totalLabel != null && (
            <span className="text-xs text-muted-foreground">{totalLabel}</span>
          )}
        </div>
      </div>
      {legend && (
        <div className="min-w-0 flex-1">
          <ChartLegendGrid items={legendItems} columns={legendColumns} />
        </div>
      )}
    </div>
  )
}
