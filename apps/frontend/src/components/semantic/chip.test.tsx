import { render, screen, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { Chip } from "./chip"

/**
 * G 类批 G1 · Chip 组件测试（方案 §六 第 4 条）
 *
 * 断言重心是 **DOM 行为分界**（onClick / onRemove / 纯展示三条交互路径），
 * props 封闭性本身由 TS 编译期约束（Chip 的 props 类型不接 className）。
 */
describe("Chip（semantic 层首件）", () => {
  describe("交互分界", () => {
    it("无 onClick 且无 onRemove 时渲染为纯展示 span，不产生 button", () => {
      const { container } = render(<Chip>标签</Chip>)
      expect(screen.getByText("标签")).toBeTruthy()
      expect(container.querySelector("button")).toBeNull()
      expect(container.querySelector("span")).not.toBeNull()
    })

    it("传 onClick 时以 button 承载可点击语义（RawButton 直通）并触发回调", () => {
      const onClick = vi.fn()
      render(<Chip onClick={onClick}>可点</Chip>)
      const btn = screen.getByRole("button")
      expect(btn.tagName).toBe("BUTTON")
      fireEvent.click(btn)
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it("仅传 onRemove 时本体保持 span，关闭钮触发 onRemove", () => {
      const onRemove = vi.fn()
      const { container } = render(<Chip onRemove={onRemove}>标签</Chip>)
      expect(container.querySelector("span")).not.toBeNull()
      fireEvent.click(screen.getByRole("button", { name: "移除" }))
      expect(onRemove).toHaveBeenCalledTimes(1)
    })

    it("onClick + onRemove 同传时点关闭钮只触发 onRemove（stopPropagation 分界）", () => {
      const onClick = vi.fn()
      const onRemove = vi.fn()
      render(
        <Chip onClick={onClick} onRemove={onRemove}>
          可删
        </Chip>,
      )
      fireEvent.click(screen.getByRole("button", { name: "移除" }))
      expect(onRemove).toHaveBeenCalledTimes(1)
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe("异常流与防护", () => {
    it("disabled 时点击不触发 onClick", () => {
      const onClick = vi.fn()
      render(
        <Chip onClick={onClick} disabled>
          禁用
        </Chip>,
      )
      const btn = screen.getByRole("button")
      expect(btn.hasAttribute("disabled")).toBe(true)
      fireEvent.click(btn)
      expect(onClick).not.toHaveBeenCalled()
    })

    it("交互态 button 的 type 恒为 button（防表单误提交，RawButton 功能保护）", () => {
      render(<Chip onClick={() => {}}>x</Chip>)
      expect(screen.getByRole("button").getAttribute("type")).toBe("button")
    })
  })

  describe("形态", () => {
    it("shape/tone 落到根元素 class（pill 默认 / soft / danger 悬停转红）", () => {
      const { container, unmount } = render(<Chip>pill</Chip>)
      expect(container.firstElementChild?.className).toContain("rounded-full")
      unmount()

      const soft = render(<Chip shape="soft">soft</Chip>)
      expect(soft.container.firstElementChild?.className).toContain("rounded-md")
      soft.unmount()

      const danger = render(<Chip tone="danger" onRemove={() => {}}>r</Chip>)
      expect(danger.container.firstElementChild?.className).toContain("accent-red")
    })
  })
})
