import type * as React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type ChartCardHeight = "sm" | "md" | "lg"

/**
 * height 档位映射自现用图表容器高度实测（2026-09-29 grep ChartContainer/图卡容器）：
 * - sm = h-30：project-overview-charts 任务分布 PieChart（唯一 h-30 实例）
 * - md = h-40（默认）：project-overview-charts 燃尽 AreaChart + analytics 成本 BarChart（最高频档）
 * - lg = h-56：team-stats-section Token 折线（CardContent h-56 档）
 */
const HEIGHT_CLASS: Record<ChartCardHeight, string> = {
  sm: "h-30",
  md: "h-40",
  lg: "h-56",
}

/**
 * ChartCard —— 图表卡壳（G 类 semantic 批二）
 *
 * 「Card + CardTitle(text-sm) + 卡头右侧 hint/action + 固定高度图表容器」组合的唯一实现，
 * 抽象自 project-overview-charts / analytics-page / team-stats-section 等 8+ 处手写图表卡。
 *
 * **props 面封闭（裁决 G8，同 chip.tsx）**：显式声明 props，不接 `className`、不透传
 * variant、不 extends HTMLAttributes。图表实现（ChartContainer + recharts 配置）留在
 * children 由调用方组装，本件只接管卡壳与定高——height 档位见 HEIGHT_CLASS 注释；
 * children 内图表用 `h-full w-full` 填充（ChartContainer 基类自带 aspect-video，
 * h-full 覆盖之），不再自带高度档。
 *
 * 壳形态基线 = project-overview-charts 现用形态：ui/card 直接作壳（不用 section-card，
 * 现用是 Card+CardTitle 而非 SectionCard），CardHeader p-4 + CardTitle text-sm font-medium
 * 左标题右 hint/action，CardContent px-4 pb-4（燃尽块原 px-2 pb-3 就近映射到该基线）。
 * data-slot="chart-card" 覆盖 Card 自带的 "card"（props 后置展开生效）。
 */
function ChartCard({
  title,
  hint,
  action,
  height = "md",
  children,
}: {
  /** 卡头左侧标题（text-sm font-medium 基线） */
  title: React.ReactNode
  /** 卡头右侧说明文字（text-xs font-normal text-muted-foreground 基线，如「近 7 天」） */
  hint?: React.ReactNode
  /** 卡头右侧动作区（按钮等，排在 hint 之后） */
  action?: React.ReactNode
  /** 图表区定高档：sm=h-30 / md=h-40（默认）/ lg=h-56，映射现用值见 HEIGHT_CLASS */
  height?: ChartCardHeight
  children: React.ReactNode
}) {
  return (
    <Card data-slot="chart-card">
      <CardHeader className="p-4">
        <CardTitle className="flex items-center justify-between gap-2 text-sm font-medium">
          <span className="truncate">{title}</span>
          {(hint != null || action != null) && (
            <span className="flex shrink-0 items-center gap-2">
              {hint != null && (
                <span className="text-xs font-normal text-muted-foreground">{hint}</span>
              )}
              {action}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div data-slot="chart-card-plot" className={HEIGHT_CLASS[height]}>
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

export { ChartCard }
export type { ChartCardHeight }
