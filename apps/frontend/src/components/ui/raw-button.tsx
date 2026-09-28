/**
 * RawButton —— ui 原子层内部的「原始按钮」具名出口（§七十（五），2026-09-28）
 *
 * 用途：ui 组合组件内部需要 button 元素语义（可聚焦 / 可触发 / aria）但**不是动作钮**的
 * 场景——把手、拖拽柄、日期格、行选择区、色块选择、进度 scrubber 等布局 / 交互语义。
 * 这些 button 有自己的功能设计，不属于 §4.5 动作钮的形态收敛范围。
 *
 * 与 `<Button>` 的分界：RawButton **不套任何基线样式**（无胶囊 / 无 variant / 无定高），
 * 形态完全由使用处负责；换用它的意义是把「非动作钮」从裸 `<button>` 字面升为具名组件——
 * 门禁与批量工具（codemod）按名字识别，从此不会把它当裸按钮替换或按动作钮档位收敛。
 *
 * 约束：
 * - `type` 默认 `"button"`（原生 button 默认 submit，嵌在表单里的原始按钮会误触发提交——
 *   这是功能保护，使用处显式传 "submit" 才会覆盖）；
 * - **仅限 `src/components/ui/**` 内部消费**：不进 COMPONENTS.md、不对业务面出口。
 *   业务面的动作钮一律走 `<Button>`（§19.2）；业务面若出现 RawButton 即分层倒置，
 *   由评审把关（无脚本）。
 * - 未来对 ui/ 内部跑收敛 codemod 时，本组件在排除名单（`data-slot="raw-button"` 可作锚点）。
 */
function RawButton({ type = "button", ...props }: React.ComponentProps<"button">) {
  return <button type={type} data-slot="raw-button" {...props} />
}

export { RawButton }
