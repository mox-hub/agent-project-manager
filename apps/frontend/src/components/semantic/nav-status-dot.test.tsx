import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { NavStatusDot } from "./nav-status-dot"

/**
 * G 类批 G1 第二件 · NavStatusDot 组件测试（§18 组件测试基线）
 *
 * 断言重心：
 * ① **a11y**（§18.2 下限的 aria-label / role 项）——本组件存在的合规前提就是
 *    §8.5#4「不得只靠颜色传达状态」，`label` 一旦没落到 DOM 上，整个组件就失效；
 * ② **渲染分支**（§18.1「有条件渲染分支」）——loading 态的双层结构是它与静态态的
 *    结构差异，属行为分界而非外观偏好；
 * ③ **§19.5 状态色链路接线**——tone 必须真的走到根元素 class 上（否则组件退化为
 *    一个无色点），断言方式与同目录 chip.test.tsx 的「形态」块保持一致。
 *
 * 未测（§18.2「不测样式」）：具体 class 组合（尺寸 / shrink-0 / relative 定位）不在此
 * 断言——它们是视觉回归与人工评审的对象。其中 `relative`（ping 层的定位祖先）与
 * `shrink-0`（防被相邻 flex-1 文案挤扁）是提取时修掉的两个存量缺陷，评审时请重点复核。
 */
describe("NavStatusDot（semantic 层第二件）", () => {
  describe("可访问性（§8.5#4：颜色之外的第二信号）", () => {
    it("label 同时落到 aria-label 与 title，并以 img 角色暴露", () => {
      render(<NavStatusDot tone="success" label="3 台机器在线" />)
      const dot = screen.getByRole("img", { name: "3 台机器在线" })
      expect(dot.getAttribute("aria-label")).toBe("3 台机器在线")
      expect(dot.getAttribute("title")).toBe("3 台机器在线")
    })

    it("loading 态同样带 aria-label / title（动画不是唯一信号）", () => {
      render(<NavStatusDot tone="default" label="正在检查运行时状态..." loading />)
      // loading 态根节点带 role="img"，内层纯装饰不重复暴露
      const dots = screen.getAllByRole("img", { name: "正在检查运行时状态..." })
      expect(dots).toHaveLength(1)
      expect(dots[0].getAttribute("title")).toBe("正在检查运行时状态...")
    })

    it("文案随 label 走，不随 tone 变（tone 只管颜色）", () => {
      render(<NavStatusDot tone="danger" label="Git 不可用：命令缺失" />)
      expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Git 不可用：命令缺失")
    })
  })

  describe("渲染分支", () => {
    it("默认（无 loading）渲染单层圆点", () => {
      const { container } = render(<NavStatusDot tone="success" label="就绪" />)
      const root = container.firstElementChild as HTMLElement
      expect(root.tagName).toBe("SPAN")
      expect(root.children).toHaveLength(0)
    })

    it("loading 态渲染双层结构（ping 叠层 + 实心点）", () => {
      const { container } = render(<NavStatusDot tone="default" label="检查中" loading />)
      const root = container.firstElementChild as HTMLElement
      expect(root.children).toHaveLength(2)
    })

    it("loading 省略等价于 false（形态不因 undefined 漂移）", () => {
      const { container } = render(<NavStatusDot tone="default" label="无人在线" />)
      expect((container.firstElementChild as HTMLElement).children).toHaveLength(0)
    })
  })

  describe("状态色链路（§19.5 tone → class）", () => {
    it("tone 落到根元素 class：success 绿 / danger 红 / default 中性", () => {
      const success = render(<NavStatusDot tone="success" label="就绪" />)
      expect((success.container.firstElementChild as HTMLElement).className).toContain("accent-green")
      success.unmount()

      const danger = render(<NavStatusDot tone="danger" label="不可用" />)
      expect((danger.container.firstElementChild as HTMLElement).className).toContain("accent-red")
      danger.unmount()

      const neutral = render(<NavStatusDot tone="default" label="无人在线" />)
      expect((neutral.container.firstElementChild as HTMLElement).className).toContain(
        "muted-foreground",
      )
    })
  })
})
