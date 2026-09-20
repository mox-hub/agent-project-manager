import * as React from 'react'

import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export interface ActivityHeatmapProps {
  /** 稀疏日序列：[{date: 'YYYY-MM-DD', count}] */
  data: Array<{ date: string; count: number }>
  /** 渲染天数（从今天往回）；年视图传 365 */
  days?: number
  className?: string
  emptyLabel?: string
  /** 格子悬浮浮窗文案（count 原值）；缺省为「N 次活动」 */
  formatTip?: (count: number) => string
}

const LEVEL_CLASS = [
  'bg-muted',
  'bg-accent-green/25',
  'bg-accent-green/45',
  'bg-accent-green/70',
  'bg-accent-green',
]

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

function levelOf(count: number, max: number): number {
  if (count <= 0) return 0
  if (max <= 1) return 4
  const ratio = count / max
  if (ratio > 0.75) return 4
  if (ratio > 0.5) return 3
  if (ratio > 0.25) return 2
  return 1
}

/**
 * 活跃热力图（GitHub 风格，纯 CSS grid，无第三方依赖）。
 * 列 = 周，行 = 周一~周日；输入稀疏序列自动补零；
 * 每格 hover 弹 Tooltip 浮窗（日期 + 用量），网格下方带月份刻度。
 */
export function ActivityHeatmap({
  data,
  days = 91,
  className,
  emptyLabel = '暂无活动',
  formatTip,
}: ActivityHeatmapProps) {
  const byDate = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const d of data) map.set(d.date, d.count)
    return map
  }, [data])

  const cells = React.useMemo(() => {
    // 对齐到周一开头
    const today = new Date()
    const end = new Date(today)
    end.setDate(end.getDate() + (7 - ((end.getDay() + 6) % 7) + 1) % 7 || 7 - 1)
    const start = new Date(end)
    start.setDate(start.getDate() - (Math.ceil(days / 7) * 7 - 1))
    const list: Array<{ date: string; count: number; future: boolean }> = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10)
      list.push({
        date: key,
        count: byDate.get(key) ?? 0,
        future: d.getTime() > today.getTime(),
      })
    }
    return list
  }, [byDate, days])

  const max = Math.max(1, ...cells.map((c) => c.count))
  const weeks: Array<Array<{ date: string; count: number; future: boolean }>> = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  // 月份刻度：每周取列首（周一）判定，1~7 日所在列为该月首列；相邻月去重
  const monthTicks = (() => {
    const ticks = new Map<number, string>()
    let lastMonth = -1
    for (let wi = 0; wi < weeks.length; wi++) {
      const first = weeks[wi][0]
      if (!first || first.future) continue
      const d = new Date(first.date)
      if (Number.isNaN(d.getTime())) continue
      if (d.getDate() <= 7 && d.getMonth() !== lastMonth) {
        ticks.set(wi, MONTH_LABELS[d.getMonth()])
        lastMonth = d.getMonth()
      }
    }
    return ticks
  })()

  const hasData = cells.some((c) => c.count > 0)

  return (
    <div data-slot="activity-heatmap" className={cn('space-y-1.5', className)}>
      {hasData ? (
        <>
          <div className="flex gap-0.5 overflow-x-auto pb-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((cell) =>
                  cell.future ? (
                    <div key={cell.date} className="size-3 rounded-3 bg-transparent" />
                  ) : (
                    <Tooltip key={cell.date}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn('size-3 rounded-3', LEVEL_CLASS[levelOf(cell.count, max)])}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-medium">{cell.date}</p>
                        <p className="text-muted-foreground">
                          {formatTip ? formatTip(cell.count) : `${cell.count} 次活动`}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ),
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-0.5">
            {weeks.map((week, wi) => (
              <span
                key={wi}
                className="w-3 shrink-0 text-10 leading-4 text-muted-foreground"
              >
                {monthTicks.get(wi) ?? ''}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      )}
      <div className="flex items-center gap-1 text-10 text-muted-foreground">
        <span>少</span>
        {LEVEL_CLASS.map((cls, i) => (
          <span key={i} className={cn('size-2.5 rounded-xs', cls)} />
        ))}
        <span>多</span>
      </div>
    </div>
  )
}
