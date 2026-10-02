import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import type { StatusIconComponent } from '@/shared/status/status-visuals';
import { cn } from "@/lib/utils"

/**
 * StatsCard —— 统计卡（语义层唯一统计卡实现，2026-09-29 统计卡归一批）
 *
 * 收编谱系（七套归一，裁决 2026-09-29）：
 * - compact（默认）＝ 原 ui/stats-card 横排瓦片（10 页消费的事实主力，形态 class 逐字沿袭）；
 * - featured ＝ 原 ui/stat-card 竖排摘要大卡（project-dashboard 摘要行）＋
 *   dashboard-page / settings ai overview / analytics 三处本地 KPI/Stat 卡的公共形态，
 *   hint / onClick 槽位只有 featured 消费；trend/trendValue 槽位已消亡移除
 *   （2026-09-30 晨会裁决：归一批后业务零消费、仅画廊 demo 持有，且 up=绿/down=红
 *   的语义映射与「错误数上升」类指标天然反向，不再承载）；
 * - 卡底（surface）与数值彩色（coloredValue）为可选项，分别收编 team-stats 灰底
 *   汇总瓦片与 acceptance KPIStats 数值着色先例。
 * 字号口径统一走 compact 基线：数值 text-xl font-mono tabular-nums，标签 text-xs。
 *
 * props 面封闭（semantic/README.md 裁决 G8）：不接 className、不 extends
 * HTMLAttributes；形态轴全部是封闭枚举（layout/tone/surface），无样式透传口子。
 * columns 为固定列；responsive=true 开启窄屏降档（md 断点以下 3 列及以上降为
 * 2 列）——2026-09-30 晨会裁决的封闭响应式档，不开 className 口子。
 * 装饰色 tone 词表留在视觉层组件内（同 metric-row 口径；§19.5 状态 tone 链路
 * ui/tone.ts 管业务状态语义，不承接此处 accent 点缀色）。
 */

/** 装饰色档（accent 点缀，非状态语义） */
export type StatsTone = "default" | "green" | "blue" | "yellow" | "red" | "purple" | "orange" | "gray"

/** tone → 图标色 + 卡片描边点缀（取值逐字沿袭原 ui/stats-card STATS_THEMES；orange 沿 metric-row 词表） */
const TONE_CLASS: Record<StatsTone, { icon: string; card?: string }> = {
  default: { icon: "text-muted-foreground" },
  green: { icon: "text-accent-green", card: "hover:border-accent-green/40" },
  blue: { icon: "text-accent-blue", card: "hover:border-accent-blue/40" },
  yellow: { icon: "text-accent-yellow", card: "hover:border-accent-yellow/40" },
  red: { icon: "text-accent-red", card: "hover:border-accent-red/40" },
  purple: { icon: "text-accent-purple", card: "hover:border-accent-purple/40" },
  orange: { icon: "text-accent-orange", card: "hover:border-accent-orange/40" },
  gray: { icon: "text-muted-foreground", card: "border-border/40" },
}

/** 卡底档：card＝白卡描边（默认）/ muted＝灰底无描边（team-stats 项目汇总先例） */
export type StatsSurface = "card" | "muted"

/** 形态变种：compact 横排瓦片 / featured 竖排摘要大卡 */
export type StatsCardLayout = "compact" | "featured"

export interface StatsCardItem {
  /** 唯一标识 */
  key: string
  /** 数值（text-xl font-mono tabular-nums 基线；语义色走 coloredValue，不手工传 class） */
  value: ReactNode
  /** 标签（compact 在数值下、featured 在数值上，text-xs text-muted-foreground 基线） */
  label: ReactNode
  /** 图标组件（size-8 灰底微框架内以 size-16 渲染） */
  icon?: StatusIconComponent
  /** 装饰色档（图标着色 + hover 描边点缀；default 不加点缀） */
  tone?: StatsTone
  /** 数值随 tone 着色（acceptance KPIStats 先例；default/gray 无色效不染） */
  coloredValue?: boolean
  /** 卡底档，默认 card */
  surface?: StatsSurface
  /** featured：数值下方补充说明 */
  hint?: ReactNode
  /** featured：整卡可点（下钻），hover 反馈由背景色承载（宪法 §3.6） */
  onClick?: () => void
}

export interface StatsCardProps {
  /** 统计项列表 */
  items: StatsCardItem[]
  /** 网格列数（固定列，默认 4） */
  columns?: 2 | 3 | 4 | 5 | 6
  /** 窄屏降档：md 断点以下 3 列及以上降为 2 列（默认关，视觉零变化） */
  responsive?: boolean
  /** 形态变种，默认 compact */
  layout?: StatsCardLayout
}

/** 固定列档 */
const GRID_CLASS: Record<NonNullable<StatsCardProps["columns"]>, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
}

/** 窄屏降档（responsive=true）：md 断点以下回 2 列 */
const GRID_RESPONSIVE_CLASS: Record<NonNullable<StatsCardProps["columns"]>, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-6",
}

export function StatsCard({ items, columns = 4, responsive = false, layout = "compact" }: StatsCardProps) {
  return (
    <div
      data-slot="stats-card"
      className={cn("grid gap-3", (responsive ? GRID_RESPONSIVE_CLASS : GRID_CLASS)[columns])}
    >
      {items.map((item) => {
        const Icon = item.icon
        const tone = item.tone ?? "default"
        const toneClass = TONE_CLASS[tone]
        const valueTone =
          item.coloredValue && tone !== "default" && tone !== "gray" ? toneClass.icon : undefined
        const clickable = layout === "featured" && !!item.onClick
        const surfaceClass =
          item.surface === "muted"
            ? "bg-muted/50"
            : "border border-border/70 bg-card shadow-xs transition-all hover:border-border"

        if (layout === "featured") {
          return (
            <div
              key={item.key}
              data-slot="stats-card-item"
              className={cn(
                "rounded-lg p-4 text-card-foreground transition-colors",
                surfaceClass,
                clickable && "cursor-pointer hover:bg-muted/50",
              )}
              onClick={item.onClick}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                {Icon && (
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md border border-border/40 bg-muted/40",
                      toneClass.icon,
                    )}
                  >
                    <Icon size={16} />
                  </div>
                )}
              </div>
              <p
                className={cn(
                  "mt-1 text-xl font-semibold font-mono tabular-nums leading-tight text-foreground",
                  valueTone,
                )}
              >
                {item.value}
              </p>
              {item.hint != null && (
                <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
              )}
            </div>
          )
        }

        return (
          <div
            key={item.key}
            data-slot="stats-card-item"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3.5 py-2.5",
              surfaceClass,
              toneClass.card,
            )}
          >
            {Icon && (
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-md border border-border/40 bg-muted/40",
                  toneClass.icon,
                )}
              >
                <Icon size={16} />
              </div>
            )}
            <div className="flex min-w-0 flex-col">
              <span
                className={cn(
                  "truncate text-xl font-semibold font-mono tabular-nums leading-tight text-foreground",
                  valueTone,
                )}
              >
                {item.value}
              </span>
              <span className="mt-0.5 truncate text-xs text-muted-foreground">{item.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
