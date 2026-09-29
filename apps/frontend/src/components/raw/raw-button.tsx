import type * as React from "react"

/**
 * RawButton —— 原语层「原始按钮」具名直通出口（G 类批 G0，自 backup 86235a82 考取）
 *
 * 用途：ui 组合组件 / 语义组件内部需要 button 元素语义（可聚焦 / 可触发 / aria）但
 * **不是动作钮**的场景——把手、拖拽柄、日期格、行选择区、色块选择、进度 scrubber、
 * chip 关闭钮等布局 / 交互语义。这些 button 有自己的功能设计，不属于动作钮的形态
 * 收敛范围（宪法 §4.5）。
 *
 * 与 `<Button>` 的分界：RawButton **不套任何基线样式**（无胶囊 / 无 variant / 无定高），
 * 形态完全由使用处负责；换用它的意义是把「非动作钮」从裸 `<button>` 字面升为具名组件——
 * 门禁与批量工具按名字识别，不会把它当裸按钮替换或按动作钮档位收敛。
 *
 * 约束：
 * - `type` 默认 `"button"`（原生 button 默认 submit，嵌在表单里的原始按钮会误触发提交——
 *   这是功能保护，使用处显式传 "submit" 才会覆盖）；
 * - **出口规则（G 类 R1/R4/R5）**：仅 `components/ui/` 与 `components/semantic/` 可消费；
 *   业务面（modules/shared/app）禁入，由 lint:layers R1 机械强制；
 * - 直通封装：不套样式基线、无 cva 轴、透传全部原生 props（G 类 R7：本目录禁 cva /
 *   基线样式类）；
 * - `data-slot="raw-button"` 可作未来批量工具的排除锚点。
 */
function RawButton({ type = "button", ...props }: React.ComponentProps<"button">) {
  return <button type={type} data-slot="raw-button" {...props} />
}

export { RawButton }
