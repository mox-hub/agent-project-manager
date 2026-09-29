import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { MetricRow } from "./metric-row"

/**
 * G 类 semantic 批二 · MetricRow 组件测试
 *
 * 断言重心：value/max 换算（显示与 progressbar aria-valuenow）、tone → indicator
 * class 映射、label 可选分界（表格列内无 label 形态）。
 */
describe("MetricRow（semantic 层）", () => {
  it("value/max 换算：显示百分数与 progressbar aria-valuenow 一致（max 默认 100，value 即百分数）", () => {
    render(<MetricRow label="进度" value={85} />)
    expect(screen.getByText("85%")).toBeTruthy()
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("85")
  })

  it("value/max 换算：max 非 100 时按比例取整（7/8 → 88%），并 clamp 到 0-100", () => {
    const scaled = render(<MetricRow value={7} max={8} />)
    expect(screen.getByText("88%")).toBeTruthy()
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("88")
    scaled.unmount()

    render(<MetricRow value={150} max={100} />)
    expect(screen.getByText("100%")).toBeTruthy()
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("100")
  })

  it("tone 落到 Progress 根的 indicator 选择器 class；default 不覆盖基线 bg-primary", () => {
    const { container, unmount } = render(<MetricRow value={50} tone="red" />)
    const progress = container.querySelector('[data-slot="progress"]')
    expect(progress?.className).toContain("[&_[data-slot=progress-indicator]]:bg-accent-red")
    unmount()

    const purple = render(<MetricRow value={50} tone="purple" />)
    expect(
      purple.container.querySelector('[data-slot="progress"]')?.className,
    ).toContain("bg-accent-purple")
    purple.unmount()

    const baseline = render(<MetricRow value={50} />)
    expect(baseline.container.querySelector('[data-slot="progress"]')?.className).not.toContain(
      "bg-accent",
    )
  })

  it("label 可选：传入时渲染 muted 小字标签，缺省时行内只有 Progress + 数值（表格进度列形态）", () => {
    const withLabel = render(<MetricRow label="项目 A" value={60} />)
    expect(withLabel.container.querySelector('[data-slot="metric-row-label"]')?.textContent).toBe(
      "项目 A",
    )
    withLabel.unmount()

    const { container } = render(<MetricRow value={60} />)
    expect(container.querySelector('[data-slot="metric-row-label"]')).toBeNull()
    expect(container.querySelector('[data-slot="metric-row-value"]')?.textContent).toBe("60%")
  })

  it("icon 与 trailing 渲染在行内两端（icon 行首、trailing 数值后）", () => {
    render(
      <MetricRow
        label="档案"
        value={45}
        icon={<span data-testid="row-dot" />}
        trailing={<span data-testid="row-trailing">9/20 槽位</span>}
      />,
    )
    expect(screen.getByTestId("row-dot")).toBeTruthy()
    expect(screen.getByTestId("row-trailing")).toBeTruthy()
  })
})
