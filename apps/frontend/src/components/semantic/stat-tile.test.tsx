import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StatTile } from "./stat-tile"

/**
 * G 类 semantic 批二 · StatTile 组件测试
 *
 * 断言重心：形态 class 与 dashboard-page 原本地 StatTile 全等（等价 bar）、
 * value 语义色经 ReactNode span 注入、icon/hint 槽位渲染。
 */
describe("StatTile（semantic 层）", () => {
  it("渲染 label 与 value", () => {
    render(<StatTile label="成员总数" value={12} />)
    expect(screen.getByText("成员总数")).toBeTruthy()
    expect(screen.getByText("12")).toBeTruthy()
  })

  it("形态 class 与原本地 StatTile 全等：根 bg-muted/50 rounded-lg p-3，label text-xs muted，value text-2xl font-semibold mt-1", () => {
    const { container } = render(<StatTile label="活跃" value={7} />)
    const root = container.querySelector('[data-slot="stat-tile"]')
    expect(root?.className).toContain("bg-muted/50")
    expect(root?.className).toContain("rounded-lg")
    expect(root?.className).toContain("p-3")

    const ps = root?.querySelectorAll("p") ?? []
    expect(ps[0]?.className).toContain("text-xs")
    expect(ps[0]?.className).toContain("text-muted-foreground")
    expect(ps[1]?.className).toContain("text-2xl")
    expect(ps[1]?.className).toContain("font-semibold")
    expect(ps[1]?.className).toContain("mt-1")
  })

  it("value 语义色由调用方 span 注入（原 className 透传的封闭化替代），色落在 value 文本节点上", () => {
    const { container } = render(
      <StatTile
        label="会话"
        value={<span className="text-accent-purple">{3}</span>}
      />,
    )
    const valueP = container.querySelector('[data-slot="stat-tile"]')?.querySelectorAll("p")[1]
    const span = valueP?.querySelector("span")
    expect(span?.className).toContain("text-accent-purple")
    expect(span?.textContent).toBe("3")
    // 本体 value p 不接调用方色（props 封闭，无样式透传口子）
    expect(valueP?.className).not.toContain("text-accent-purple")
  })

  it("icon 渲染在 label 前、hint 渲染在 value 后；均缺省时不产生多余节点", () => {
    const withSlots = render(
      <StatTile
        label="负载"
        value="64%"
        icon={<span data-testid="tile-icon" />}
        hint="近 7 天均值"
      />,
    )
    expect(withSlots.getByTestId("tile-icon")).toBeTruthy()
    expect(withSlots.getByText("近 7 天均值")).toBeTruthy()
    withSlots.unmount()

    const { container } = render(<StatTile label="任务" value={5} />)
    expect(container.querySelectorAll('[data-slot="stat-tile"] p').length).toBe(2)
  })
})
