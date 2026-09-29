import type * as React from "react"

/**
 * RawInput —— 原语层「原始输入」具名直通出口（G 类批 G0，自 backup ff06715c 考取）
 *
 * 与 RawButton 同模式：ui 组合组件 / 语义组件内部需要 input 元素语义但**不是标准输入
 * 控件**的场景——表单隐藏域（`type="hidden"` 承载提交值）、菜单内嵌紧凑搜索条（自绘
 * 无框形态）等。这些 input 有自己的形态设计，换用标准 `<Input>` 会带来边框 / 内距 /
 * 定高基线、破坏原设计。
 *
 * 约束：
 * - **出口规则（G 类 R1/R4/R5）**：仅 `components/ui/` 与 `components/semantic/` 可消费；
 *   业务面（modules/shared/app）禁入，由 lint:layers R1 机械强制；业务面的输入控件
 *   一律走 `<Input>`；
 * - 直通封装：不套样式基线、无 cva 轴、透传全部原生 props（G 类 R7）；
 * - `data-slot="raw-input"` 可作未来批量工具的排除锚点。
 */
function RawInput(props: React.ComponentProps<"input">) {
  return <input data-slot="raw-input" {...props} />
}

export { RawInput }
