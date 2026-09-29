import type * as React from "react"

/**
 * RawSelect —— 原语层「原始下拉」具名直通出口（G 类簇 G 工具条重簇，随 toolbar-row /
 * view-display-popover 收编考取）
 *
 * 与 RawButton / RawInput 同模式：ui 组合组件 / 语义组件内部需要 select 元素语义
 * （原生下拉的键鼠 / 读屏行为）但**不是标准表单选择控件**的场景——设置面板里自绘
 * 紧凑形态的分组 / 排序切换等。这些 select 有自己的形态设计（定高 / 无 label 包装 /
 * 自管边框），换用 ui/select-field 或 ui/select 会引入表单基线、破坏原设计。
 *
 * 约束：
 * - **出口规则（G 类 R1/R4/R5）**：仅 `components/ui/` 与 `components/semantic/` 可消费；
 *   业务面（modules/shared/app）禁入，由 lint:layers R1 机械强制；业务面的选择控件
 *   一律走 ui 层具名组件；
 * - 直通封装：不套样式基线、无 cva 轴、透传全部原生 props（含 ref，React 19 ref 直传，
 *   G 类 R7：本目录禁 cva / 基线样式类）；
 * - `data-slot="raw-select"` 可作未来批量工具的排除锚点。
 */
function RawSelect(props: React.ComponentProps<"select">) {
  return <select data-slot="raw-select" {...props} />
}

export { RawSelect }
