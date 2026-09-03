import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "react-router-dom"
import { ThemeProvider } from "@/shared/theme/theme-context"
import { ConfirmProvider } from "@/shared/confirm/confirm-provider"
import { ToastProvider } from "@/components/ui/toast"
import { forwardConsole } from "@/shared/lib/logger"
import { router } from "./app/router"
import { LoadingProvider } from "@/components/ui/loading-overlay"
import { GlobalLoadingState } from "@/components/ui/global-loading-state"
import { MockBadge } from "@/components/ui/mock-badge"
import { isMockModeEnabled } from "@/mocks"
import "./index.css"
import "./i18n" // i18n initialization

forwardConsole()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LoadingProvider defaultMode="bar">
        <ThemeProvider>
          <ConfirmProvider>
            <RouterProvider router={router} />
            <GlobalLoadingState />
            <ToastProvider position="top-right" />
            <MockBadge />
          </ConfirmProvider>
        </ThemeProvider>
      </LoadingProvider>
    </QueryClientProvider>
  </StrictMode>
)

// msw mock 模式（宪法 §9）：仅 dev + VITE_API_MOCK=on 时启用，生产构建不进入启动路径
if (isMockModeEnabled()) {
  const { worker } = await import("./mocks/browser")
  await worker.start({ onUnhandledRequest: "bypass" })
}
