import type * as React from "react"

/**
 * StatTile —— mini 统计块（G 类 semantic 批二）
 *
 * 弹窗 / 面板内「灰底 + 小标签 + 大数值」mini 统计块的唯一实现，抽象自
 * dashboard-page 下钻弹窗内原本地 StatTile（7 个弹窗 14 实例）及 team-stats-section
 * 等同类 tile。
 *
 * **形态照抄 dashboard-page 本地 StatTile 现有 class（等价 bar：几何/颜色一致）**：
 * 根 `bg-muted/50 rounded-lg p-3`，label `text-xs text-muted-foreground`，value
 * `text-2xl font-semibold mt-1`。原实现经 className 透传给 value 上语义色（如
 * text-accent-purple）——semantic 层 props 封闭后不设样式口子，语义色由调用方
 * 以 ReactNode 包 span 注入：`value={<span className="text-accent-purple">{v}</span>}`，
 * 渲染结果与原 p 直接着色一致（色沿文本继承，零形态差）。
 *
 * **props 面封闭（裁决 G8，同 chip.tsx）**：不接 `className`、不透传 variant、
 * 不 extends HTMLAttributes。icon 取 `React.ReactNode` 而非 LucideIcon——首消费
 * dashboard-page 的 tile 形态无 icon 先例，无证据支持组件级图标档，与 chip 同口径
 * 留节点槽位即可；hint 为数值下方补充说明（现用形态暂无实例，留标准槽位）。
 */
function StatTile({
  label,
  value,
  hint,
  icon,
}: {
  /** 数值上方小标签（text-xs text-muted-foreground 基线） */
  label: React.ReactNode
  /** 主数值（text-2xl font-semibold mt-1 基线；语义色由调用方包 span 注入） */
  value: React.ReactNode
  /** 数值下方补充说明 */
  hint?: React.ReactNode
  /** 标签前缀图标节点（size 档由调用方给，基线 size-3.5） */
  icon?: React.ReactNode
}) {
  return (
    <div data-slot="stat-tile" className="bg-muted/50 rounded-lg p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint != null && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export { StatTile }
