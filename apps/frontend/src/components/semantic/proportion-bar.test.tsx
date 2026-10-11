import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ProportionBar } from "./proportion-bar"

describe("ProportionBar（分段比例条）", () => {
  const segments = [
    { key: "urgent", label: "Urgent", value: 120 },
    { key: "high", label: "High", value: 340 },
    { key: "medium", label: "Medium", value: 860 },
  ]

  it("渲染分段条与图例（标签 + 数值 + 占比）", () => {
    const { container } = render(<ProportionBar segments={segments} />)
    expect(screen.getByText("Urgent")).toBeTruthy()
    expect(screen.getByText("120")).toBeTruthy()
    // 分母缺省 = 各段合计（1320）：120/1320 ≈ 9.1%
    expect(screen.getByText("9.1%")).toBeTruthy()
    // 条轨存在且每段一个着色块（120+340+860 全为正值 → 3 段）
    const track = container.querySelector('[data-slot="proportion-bar"] > div')
    expect(track).not.toBeNull()
    expect(track!.childElementCount).toBe(3)
  })

  it("total 大于各段合计时余量以斜纹段呈现（正段数 + 1 余量块）", () => {
    const { container } = render(<ProportionBar segments={segments} total={2000} />)
    const track = container.querySelector('[data-slot="proportion-bar"] > div')
    expect(track!.childElementCount).toBe(4)
    // 占比改以 total 为分母：120/2000 = 6%
    expect(screen.getByText("6%")).toBeTruthy()
  })

  it("零值段不渲染色块但保留图例（0% 弱化行）", () => {
    render(
      <ProportionBar
        segments={[...segments, { key: "low", label: "Low", value: 0 }]}
      />,
    )
    expect(screen.getByText("Low")).toBeTruthy()
    expect(screen.getByText("0%")).toBeTruthy()
  })

  it("总量为 0 时渲染 empty 槽位而非空条（§17.5）", () => {
    render(
      <ProportionBar
        segments={[{ key: "a", label: "A", value: 0 }]}
        empty={<div>暂无构成数据</div>}
      />,
    )
    expect(screen.getByText("暂无构成数据")).toBeTruthy()
  })

  it("legend=false 时不渲染图例网格", () => {
    render(<ProportionBar segments={segments} legend={false} />)
    expect(screen.queryByText("Urgent")).toBeNull()
  })
})
