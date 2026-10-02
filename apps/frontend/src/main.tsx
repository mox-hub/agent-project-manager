// Buffer polyfill 必须最先执行：gray-matter（文档 frontmatter）依赖裸 Buffer 全局，
// 浏览器端缺失会让文档编辑页「保存」在 mergeFrontmatter 处同步抛 ReferenceError
import "./polyfills"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "react-router-dom"
import { ThemeProvider } from "@/shared/theme/theme-context"
import { ConfirmProvider } from "@/shared/confirm/confirm-provider"
import { PromptProvider } from "@/shared/prompt/prompt-provider"
import { ToastProvider } from "@/components/ui/toast"
import { router } from "./app/router"
import { renderStartupFailure } from "./app/startup-failure"
import { restoreDesktopSession } from "@/shared/lib/desktop-session"
import { LoadingProvider } from "@/components/semantic/loading-overlay"
import { GlobalLoadingState } from "@/components/semantic/global-loading-state"
import { MockBadge } from "@/components/ui/mock-badge"
import { isMockModeEnabled } from "@/mocks"
import "./index.css"
import "./i18n" // i18n initialization

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const root = createRoot(document.getElementById("root")!)

function renderApp(): void {
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <LoadingProvider defaultMode="bar">
          <ThemeProvider>
            <ConfirmProvider>
              <PromptProvider>
                <RouterProvider router={router} />
                <GlobalLoadingState />
                <ToastProvider position="top-right" />
                <MockBadge />
              </PromptProvider>
            </ConfirmProvider>
          </ThemeProvider>
        </LoadingProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}

// msw mock 模式（宪法 §9）：仅 dev + VITE_API_MOCK=on 时启用，生产构建不进入启动路径。
// 必须先于路由挂载与首次请求就绪，否则挂载即发的请求打不到 mock。
if (isMockModeEnabled()) {
  const { worker } = await import("./mocks/browser")
  await worker.start({ onUnhandledRequest: "bypass" })
}

// 桌面模式：壳侧镜像（token / 工作区选择 / 引导标记）与壳侧真实后端地址先就绪再挂载
// 路由——否则 AuthGuard 会用漂移后 origin 的空 localStorage 误判未登录，请求也会打到
// 未知后端。Web 模式恒 ready，行为不变。
void restoreDesktopSession().then(
  (result) => {
    if (!result.ready) {
      renderStartupFailure(result.reason)
      return
    }
    renderApp()
  },
  (err: unknown) => {
    renderStartupFailure(err instanceof Error ? err.message : String(err))
  }
)
