import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ThemeModeCard, type ThemeModeValue } from "./theme-mode-card"

/**
 * G 类批 G1 第三件 · ThemeModeCard 组件测试（§18 组件测试基线）
 *
 * 断言重心：
 * ① **三档齐备**（§18.1）——本件相对提取前的唯一行为增量就是多了「跟随系统」一档，
 *    而它恰好是最容易在 `TILE_MODES` / `options` 键域 / 展示顺序上出错的维度；
 * ② **a11y**（§18.2 下限的 aria-pressed 项）——每档是开关而非动作钮，选中态必须
 *    以 `aria-pressed` 暴露给 AT，不能只靠色环；
 * ③ **条件渲染分支**（§18.1）——选中徽标只挂选中档；预览窗口在 `system` 档走左右
 *    分屏（两种主题各一块），其余档只画自己那一块。
 *
 * 未测（§18.2「不测样式」）：色环 / 边框 / hover 放大等视觉类名不在此断言。
 * 预览分支的断言走 `data-slot` / `data-theme-variant` 锚点，不读字面色 class——
 * 否则 A.1 行 A8 的豁免色一旦调整（如换预览配色），断言会跟着碎，而行为并未变。
 */
const OPTIONS: Record<ThemeModeValue, { label: string; desc: string }> = {
  light: { label: "日间模式", desc: "始终使用浅色主题" },
  dark: { label: "夜间模式", desc: "始终使用深色主题" },
  system: { label: "跟随系统", desc: "自动匹配系统的外观设置" },
}

function renderCard(value: ThemeModeValue = "light", onChange = vi.fn()) {
  const view = render(
    <ThemeModeCard value={value} onChange={onChange} title="主题模式" options={OPTIONS} />,
  )
  return { ...view, onChange }
}

/** 取某一档的选择块（RawButton → 原生 button，用可访问名定位） */
const tile = (label: string) => screen.getByRole("button", { name: new RegExp(label) })
const previews = (label: string) =>
  Array.from(tile(label).querySelectorAll('[data-slot="theme-preview"]')).map((el) =>
    el.getAttribute("data-theme-variant"),
  )

describe("ThemeModeCard（semantic 层第三件）", () => {
  describe("三档齐备（§18.1 行为增量）", () => {
    it("渲染日间 / 夜间 / 跟随系统三档，文案取自 options", () => {
      renderCard()
      for (const mode of ["light", "dark", "system"] as const) {
        expect(tile(OPTIONS[mode].label)).toBeInTheDocument()
        expect(screen.getByText(OPTIONS[mode].desc)).toBeInTheDocument()
      }
      expect(screen.getAllByRole("button")).toHaveLength(3)
    })

    it("title 落到卡片标题（外壳随 Card 一起抽出）", () => {
      renderCard()
      expect(screen.getByText("主题模式")).toBeInTheDocument()
    })
  })

  describe("可访问性（§8.5#4：选中不能只靠颜色）", () => {
    it("aria-pressed 只对选中档为 true", () => {
      renderCard("dark")
      expect(tile(OPTIONS.dark.label)).toHaveAttribute("aria-pressed", "true")
      expect(tile(OPTIONS.light.label)).toHaveAttribute("aria-pressed", "false")
      expect(tile(OPTIONS.system.label)).toHaveAttribute("aria-pressed", "false")
    })

    it("system 档同样是合法选中态（三档地位对等）", () => {
      renderCard("system")
      expect(tile(OPTIONS.system.label)).toHaveAttribute("aria-pressed", "true")
      expect(tile(OPTIONS.light.label)).toHaveAttribute("aria-pressed", "false")
      expect(tile(OPTIONS.dark.label)).toHaveAttribute("aria-pressed", "false")
    })
  })

  describe("选择行为", () => {
    it("点击某一档回传该档的值", () => {
      const { onChange } = renderCard("light")
      fireEvent.click(tile(OPTIONS.system.label))
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith("system")
    })

    it("点击已选中档仍回传该档（组件不自持状态，纯受控）", () => {
      const { onChange } = renderCard("dark")
      fireEvent.click(tile(OPTIONS.dark.label))
      expect(onChange).toHaveBeenCalledWith("dark")
    })
  })

  describe("条件渲染分支", () => {
    it("选中徽标只挂在选中档上", () => {
      renderCard("system")
      // 选择块内唯一的 svg 就是选中徽标（标题的 SunMoon 在卡片头部，不在块内）
      expect(tile(OPTIONS.system.label).querySelectorAll("svg")).toHaveLength(1)
      expect(tile(OPTIONS.light.label).querySelectorAll("svg")).toHaveLength(0)
      expect(tile(OPTIONS.dark.label).querySelectorAll("svg")).toHaveLength(0)
    })

    it("日间 / 夜间档各画一块对应主题的预览", () => {
      renderCard()
      expect(previews(OPTIONS.light.label)).toEqual(["light"])
      expect(previews(OPTIONS.dark.label)).toEqual(["dark"])
    })

    it("跟随系统档左右分屏，同时画日间与夜间两块预览", () => {
      renderCard()
      expect(previews(OPTIONS.system.label)).toEqual(["light", "dark"])
    })
  })
})
