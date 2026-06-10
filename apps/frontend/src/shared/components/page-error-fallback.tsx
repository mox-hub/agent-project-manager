import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom"
import {
  AlertTriangleIcon,
  RefreshCwIcon,
  HomeIcon,
  ArrowLeftIcon,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/* ============================================
   PageErrorFallback — 页面级错误降级
   放在 ShellLayout 子路由 errorElement 位置
   不遮挡侧边栏和顶部导航，只覆盖内容区
   ============================================ */

interface PageErrorFallbackProps {
  className?: string
}

export function PageErrorFallback({ className }: PageErrorFallbackProps) {
  const error = useRouteError()

  let errorMessage = "加载内容时遇到问题"
  let errorStatus: number | undefined

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status
    errorMessage =
      error.status === 404
        ? "页面内容不存在"
        : error.statusText || error.data?.message || `请求失败 (${error.status})`
  } else if (error instanceof Error) {
    errorMessage = error.message
  } else if (typeof error === "string") {
    errorMessage = error
  }

  const isNotFound = errorStatus === 404

  return (
    <div className={cn("flex-1 flex items-center justify-center p-6", className)}>
      <Alert
        variant="destructive"
        className="max-w-md w-full text-left"
        role="alert"
      >
        <AlertTriangleIcon className="size-4 text-destructive" />
        <AlertTitle className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-destructive">
            {isNotFound ? "E404" : "EERR"}
          </span>
          <span>{isNotFound ? "页面未找到" : "加载失败"}</span>
        </AlertTitle>
        <AlertDescription className="flex flex-col gap-3 pt-1">
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="xs" variant="outline" onClick={() => window.history.back()}>
              <ArrowLeftIcon className="size-3 mr-1" />
              返回
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                window.location.reload()
              }}
            >
              <RefreshCwIcon className="size-3 mr-1" />
              重试
            </Button>
            <Button size="xs" variant="ghost" asChild>
              <Link to="/app">
                <HomeIcon className="size-3 mr-1" />
                首页
              </Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}
