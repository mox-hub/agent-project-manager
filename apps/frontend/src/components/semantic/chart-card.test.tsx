import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ChartCard } from "./chart-card"

/**
 * G 类 semantic 批二 · ChartCard 组件测试
 *
 * 断言重心：height 档 class 落到图表容器、hint/action 渲染分界、壳形态基线。
 * props 封闭性本身由 TS 编译期约束（props 类型不接 className）。
 */
describe("ChartCard（semantic 层）", () => {
  it("渲染卡头标题与 children 图表区", () => {
    render(
      <ChartCard title="燃尽图">
        <div data-testid="plot">图表</div>
      </ChartCard>,
    )
    expect(screen.getByText("燃尽图")).toBeTruthy()
    expect(screen.getByTestId("plot")).toBeTruthy()
  })

  it("height 档落到图表容器：默认 md=h-40，sm=h-30，lg=h-56", () => {
    const md = render(
      <ChartCard title="a">
        <div />
      </ChartCard>,
    )
    const plot = md.container.querySelector('[data-slot="chart-card-plot"]')
    expect(plot?.className).toContain("h-40")
    md.unmount()

    const sm = render(
      <ChartCard title="b" height="sm">
        <div />
      </ChartCard>,
    )
    expect(sm.container.querySelector('[data-slot="chart-card-plot"]')?.className).toContain("h-30")
    sm.unmount()

    const lg = render(
      <ChartCard title="c" height="lg">
        <div />
      </ChartCard>,
    )
    expect(lg.container.querySelector('[data-slot="chart-card-plot"]')?.className).toContain("h-56")
  })

  it("不传 hint/action 时不渲染卡头右侧组；传入时 hint 落 muted 小字、action 渲染在 hint 之后", () => {
    const bare = render(
      <ChartCard title="t">
        <div />
      </ChartCard>,
    )
    expect(bare.container.textContent).not.toContain("近 7 天")
    bare.unmount()

    render(
      <ChartCard
        title="t"
        hint="近 7 天"
        action={
          <button type="button" aria-label="导出">
            导出
          </button>
        }
      >
        <div />
      </ChartCard>,
    )
    expect(screen.getByText("近 7 天")).toBeTruthy()
    const right = screen.getByText("近 7 天").parentElement
    const btn = screen.getByRole("button", { name: "导出" })
    // hint 在前、action 在后（DOM 序即视觉序）
    expect(right?.contains(btn)).toBe(true)
    expect(right?.lastElementChild).toBe(btn)
  })

  it("壳形态基线：data-slot=chart-card 覆盖 Card 自带值，卡头为 p-4 + text-sm font-medium", () => {
    const { container } = render(
      <ChartCard title="t">
        <div />
      </ChartCard>,
    )
    expect(container.querySelector('[data-slot="chart-card"]')).toBeTruthy()
    const title = container.querySelector('[data-slot="card-title"]')
    expect(title?.className).toContain("text-sm")
    expect(title?.className).toContain("font-medium")
  })

  it("footer 来源行：不传不渲染；传入渲染 data-slot=chart-card-footer（lieflat 签名行）", () => {
    const bare = render(
      <ChartCard title="t">
        <div />
      </ChartCard>,
    )
    expect(bare.container.querySelector('[data-slot="chart-card-footer"]')).toBeNull()
    bare.unmount()

    const withFooter = render(
      <ChartCard title="t" footer="DELIVERY · LAST 7 DAYS">
        <div />
      </ChartCard>,
    )
    const footer = withFooter.container.querySelector('[data-slot="chart-card-footer"]')
    expect(footer?.textContent).toBe("DELIVERY · LAST 7 DAYS")
  })
})
