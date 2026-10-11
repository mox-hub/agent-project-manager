import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { DonutChart } from "./donut-chart"

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverMock)

describe("DonutChart（环形占比图）", () => {
  const items = [
    { key: "claude", label: "claude-code", value: 13.91 },
    { key: "deepseek", label: "deepseek", value: 0.11 },
  ]

  it("渲染中心总计（缺省 = 合计走 formatValue）与中心标签", () => {
    render(
      <DonutChart
        items={items}
        totalLabel="合计"
        formatValue={(v) => `$${v.toFixed(2)}`}
        ariaLabel="支出构成"
      />,
    )
    expect(screen.getByText("$14.02")).toBeTruthy()
    expect(screen.getByText("合计")).toBeTruthy()
  })

  it("渲染图例（标签 + 格式化数值 + 占比），占比按合计归一", () => {
    render(<DonutChart items={items} formatValue={(v) => `$${v.toFixed(2)}`} />)
    expect(screen.getByText("claude-code")).toBeTruthy()
    expect(screen.getByText("$13.91")).toBeTruthy()
    expect(screen.getByText("99.2%")).toBeTruthy()
    expect(screen.getByText("0.8%")).toBeTruthy()
  })

  it("显式 total 节点覆盖缺省合计", () => {
    render(<DonutChart items={items} total={<span>自定义</span>} />)
    expect(screen.getByText("自定义")).toBeTruthy()
  })

  it("合计为 0 时渲染 empty 槽位而非空白环（§17.5）", () => {
    render(
      <DonutChart
        items={[{ key: "a", label: "A", value: 0 }]}
        empty={<div>暂无构成数据</div>}
      />,
    )
    expect(screen.getByText("暂无构成数据")).toBeTruthy()
  })

  it("legend=false 时不渲染图例网格", () => {
    render(<DonutChart items={items} legend={false} />)
    expect(screen.queryByText("claude-code")).toBeNull()
  })
})
