/**
 * RawInput —— ui 原子层内部的「原始输入」具名出口（§七十（五）扩展，2026-09-28）
 *
 * 与 RawButton 同模式：ui 组合组件内部需要 input 元素语义但**不是标准输入控件**的场景——
 * 表单隐藏域（`type="hidden"` 承载提交值）、菜单内嵌紧凑搜索条（自绘无框形态）等。
 * 这些 input 有自己的形态设计，换用标准 `<Input>` 会带来边框/内距/定高基线、破坏原设计。
 *
 * 约束：**仅限 `src/components/ui/**` 内部消费**，不进 COMPONENTS.md、不对业务面出口；
 * `data-slot="raw-input"` 可作未来批量工具的排除锚点。业务面的输入控件一律走 `<Input>`。
 */
function RawInput(props: React.ComponentProps<"input">) {
  return <input data-slot="raw-input" {...props} />
}

export { RawInput }
