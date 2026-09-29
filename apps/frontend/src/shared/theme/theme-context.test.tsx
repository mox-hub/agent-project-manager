import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { ThemeProvider, useTheme } from "./theme-context"

/**
 * 主题状态模型测试（§18.1：含条件分支 / 状态逻辑的模块必须有测试）
 *
 * 本文件锁的是 2026-09-29「主题模式三档」改动引入的两条**模型不变量**，
 * 它们都靠肉眼看不出来、只有系统偏好与存量数据错位时才暴露：
 *
 * ① **意图（`mode`）与生效（`resolvedMode`）分离**——`system` 在落到 DOM 之前
 *    必须被解析成 light / dark。把二者混为一谈的典型症状：消费者写
 *    `mode === 'dark'` 判深色，在「跟随系统 + 系统是深色」时得到 false。
 * ② **落盘的是意图，不是解析结果**——若把 `resolvedMode` 写进 localStorage，
 *    「跟随系统」这个选择本身在刷新后就丢了（会被固化成当时的解析值）。
 *
 * 空转风险提示：jsdom **未实现** `matchMedia`，故本文件显式装桩（见下）。
 * 若不装桩，`getSystemTheme()` 会走「非浏览器环境回落 light」的分支，
 * 于是所有 system 档的用例都会在无告警的情况下退化成「只测了 light」。
 */
let systemPrefersDark = false
const changeListeners = new Set<(event: MediaQueryListEvent) => void>()

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    get matches() {
      return query.includes("prefers-color-scheme: dark") ? systemPrefersDark : false
    },
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      changeListeners.add(listener)
    },
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      changeListeners.delete(listener)
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
})

/** 模拟系统外观变更（真实浏览器为媒体查询 change 事件） */
function emitSystemPrefers(dark: boolean) {
  systemPrefersDark = dark
  act(() => {
    for (const listener of [...changeListeners]) {
      listener({ matches: dark } as MediaQueryListEvent)
    }
  })
}

beforeEach(() => {
  systemPrefersDark = false
  vi.mocked(localStorage.getItem).mockReturnValue(undefined)
  vi.mocked(localStorage.setItem).mockReturnValue(undefined)
})

afterEach(() => {
  changeListeners.clear()
  document.documentElement.classList.remove("light", "dark")
  vi.mocked(localStorage.getItem).mockReset()
  vi.mocked(localStorage.setItem).mockReset()
})

afterAll(() => {
  systemPrefersDark = false
})

/** 把上下文里的四个值摊平成可断言文本（避免依赖 testid 命名约定） */
function Probe() {
  const { mode, resolvedMode, setTheme, toggleTheme } = useTheme()
  return (
    <div>
      <span>{`mode:${mode}`}</span>
      <span>{`resolved:${resolvedMode}`}</span>
      <button onClick={() => setTheme("system")}>选跟随系统</button>
      <button onClick={() => setTheme("dark")}>选夜间</button>
      <button onClick={toggleTheme}>切换</button>
    </div>
  )
}

const renderProbe = () =>
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  )

/** 某键的落盘值序列（键存在但取 undefined 表示未被写过） */
const persisted = (key: string) =>
  vi
    .mocked(localStorage.setItem)
    .mock.calls.filter(([k]) => k === key)
    .map(([, value]) => value)

describe("ThemeProvider（主题状态模型）", () => {
  describe("意图与生效主题分离（不变量 ①）", () => {
    it("无存量意图时默认「跟随系统」，生效主题取系统偏好（浅色）", () => {
      renderProbe()
      expect(screen.getByText("mode:system")).toBeInTheDocument()
      expect(screen.getByText("resolved:light")).toBeInTheDocument()
    })

    it("无存量意图 + 系统深色 → 意图仍是 system，生效为 dark", () => {
      systemPrefersDark = true
      renderProbe()
      // 这两条断言缺一不可：若把 system 解析后写回 mode，mode 会变成 dark
      expect(screen.getByText("mode:system")).toBeInTheDocument()
      expect(screen.getByText("resolved:dark")).toBeInTheDocument()
    })

    it("存量意图为 dark 时压过系统偏好（浅色系统下仍为 dark）", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("dark")
      renderProbe()
      expect(screen.getByText("mode:dark")).toBeInTheDocument()
      expect(screen.getByText("resolved:dark")).toBeInTheDocument()
    })

    it("存量意图为 light 时压过系统偏好（深色系统下仍为 light）", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("light")
      systemPrefersDark = true
      renderProbe()
      expect(screen.getByText("mode:light")).toBeInTheDocument()
      expect(screen.getByText("resolved:light")).toBeInTheDocument()
    })

    it("存量值非法（旧版本 / 脏数据）时回落 system，不抛错", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("purple")
      renderProbe()
      expect(screen.getByText("mode:system")).toBeInTheDocument()
    })

    it("系统偏好实时变化时生效主题跟随（意图不动）", () => {
      renderProbe()
      expect(screen.getByText("resolved:light")).toBeInTheDocument()

      emitSystemPrefers(true)
      expect(screen.getByText("resolved:dark")).toBeInTheDocument()
      expect(screen.getByText("mode:system")).toBeInTheDocument()

      emitSystemPrefers(false)
      expect(screen.getByText("resolved:light")).toBeInTheDocument()
    })

    it("意图为 light / dark 时不受系统偏好变化影响", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("light")
      renderProbe()
      emitSystemPrefers(true)
      expect(screen.getByText("resolved:light")).toBeInTheDocument()
    })
  })

  describe("落盘的是意图，不是解析结果（不变量 ②）", () => {
    it("挂载即按当前意图落盘（三档之一，含 system 本身）", () => {
      renderProbe()
      expect(persisted("theme-mode")).toContain("system")
    })

    it("选择某一档后落盘该档", () => {
      renderProbe()
      fireEvent.click(screen.getByText("选夜间"))
      expect(screen.getByText("mode:dark")).toBeInTheDocument()
      expect(persisted("theme-mode")).toContain("dark")
    })

    it("系统偏好变化不会把解析结果写进落盘值", () => {
      renderProbe()
      emitSystemPrefers(true)
      expect(screen.getByText("resolved:dark")).toBeInTheDocument()
      // 落盘值里永远不该出现「被解析后的 dark」——出现了说明 system 这个选择会丢
      expect(persisted("theme-mode")).not.toContain("dark")
    })
  })

  describe("切换按钮（toggleTheme）", () => {
    it("处于跟随系统且系统深色时，切换落到 light 而非 dark（按钮不「失灵」）", () => {
      systemPrefersDark = true
      renderProbe()
      fireEvent.click(screen.getByText("切换"))
      expect(screen.getByText("mode:light")).toBeInTheDocument()
      expect(screen.getByText("resolved:light")).toBeInTheDocument()
    })

    it("处于跟随系统且系统浅色时，切换落到 dark", () => {
      renderProbe()
      fireEvent.click(screen.getByText("切换"))
      expect(screen.getByText("mode:dark")).toBeInTheDocument()
    })

    it("显式意图下按意图取反", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("dark")
      renderProbe()
      fireEvent.click(screen.getByText("切换"))
      expect(screen.getByText("mode:light")).toBeInTheDocument()
    })
  })

  describe("DOM 侧效应", () => {
    it("生效主题落到 documentElement 的 class（light / dark 互斥）", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("dark")
      const root = document.documentElement
      renderProbe()
      expect(root.classList.contains("dark")).toBe(true)
      expect(root.classList.contains("light")).toBe(false)

      fireEvent.click(screen.getByText("选跟随系统"))
      // 系统此刻为浅色 → 由 dark 意图切到 system 后生效主题变为 light
      expect(root.classList.contains("light")).toBe(true)
      expect(root.classList.contains("dark")).toBe(false)
    })
  })

  describe("useTheme 边界", () => {
    it("Provider 外调用抛错", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {})
      expect(() => render(<Probe />)).toThrow(/useTheme must be used within a ThemeProvider/)
      spy.mockRestore()
    })
  })
})
