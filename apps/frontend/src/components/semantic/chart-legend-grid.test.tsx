import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ChartLegendGrid, SERIES_COLORS } from "./chart-legend-grid"

describe("ChartLegendGrid（图例网格）", () => {
  const items = [
    { key: "a", label: "System Prompt", color: SERIES_COLORS[0], value: "47.4k", percentage: "18%" },
    { key: "b", label: "Tool Results", color: SERIES_COLORS[1], value: "1.8M", percentage: "68%" },
  ]

  it("渲染色点 + 标签 + 数值 + 占比四段式图例项", () => {
    render(<ChartLegendGrid items={items} />)
    expect(screen.getByText("System Prompt")).toBeTruthy()
    expect(screen.getByText("47.4k")).toBeTruthy()
    expect(screen.getByText("18%")).toBeTruthy()
    expect(screen.getByText("Tool Results")).toBeTruthy()
  })

  it("value / percentage 缺省时只渲染色点与标签", () => {
    render(<ChartLegendGrid items={[{ key: "a", label: "仅标签", color: SERIES_COLORS[0] }]} />)
    expect(screen.getByText("仅标签")).toBeTruthy()
    expect(screen.queryByText("18%")).toBeNull()
  })

  it("items 为空渲染 null（不留空网格）", () => {
    const { container } = render(<ChartLegendGrid items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it("系列色序 = --chart-1..5（§17.2），首点取 chart-1", () => {
    expect(SERIES_COLORS[0]).toBe("hsl(var(--chart-1))")
    expect(SERIES_COLORS).toHaveLength(5)
  })
})
