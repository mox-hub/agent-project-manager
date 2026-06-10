import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom"
import {
  FileQuestionIcon,
  ServerCrashIcon,
  RefreshCwIcon,
  HomeIcon,
  ArrowLeftIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ErrorPageProps {
  className?: string
}

export function ErrorPage({ className }: ErrorPageProps) {
  const error = useRouteError()

  let errorMessage = "一个意外的错误发生了"
  let errorStatus: number | undefined
  let errorCode = "EERR"
  let ErrorIcon = ServerCrashIcon
  let iconColor = "text-destructive"
  let iconBgClass = "bg-destructive/10"

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status
    errorCode = `E${errorStatus}`
    errorMessage = error.statusText || error.data?.message || `请求失败 (${error.status})`

    if (error.status === 404) {
      ErrorIcon = FileQuestionIcon
      iconColor = "text-[hsl(var(--accent-yellow))]"
      iconBgClass = "bg-[hsl(var(--accent-yellow-light))]"
      errorMessage = "您访问的页面不存在或已被移除"
    } else if (error.status >= 500) {
      ErrorIcon = ServerCrashIcon
      iconColor = "text-destructive"
      iconBgClass = "bg-destructive/10"
      errorMessage = "服务器开小差了，请稍后再试"
    }
  } else if (error instanceof Error) {
    errorMessage = error.message
  } else if (typeof error === "string") {
    errorMessage = error
  }

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center p-6",
        "bg-background",
        className
      )}
    >
      <div className="w-full max-w-md text-center space-y-6">
        {/* Icon */}
        <div className={cn("inline-flex items-center justify-center rounded-2xl p-4", iconBgClass)}>
          <ErrorIcon className={cn("size-10", iconColor)} />
        </div>

        {/* Status Code */}
        {errorStatus && (
          <div className="space-y-1">
            <p className="font-mono text-6xl font-bold tracking-tight text-foreground/10 select-none">
              {errorStatus}
            </p>
          </div>
        )}

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            {errorStatus === 404 ? "页面未找到" : "出了点问题"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{errorMessage}</p>
        </div>

        {/* Error Code Badge */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-mono font-medium text-muted-foreground">
            <span className="text-destructive">{errorCode}</span>
            <span className="text-border">/</span>
            <span>{errorStatus === 404 ? "NOT_FOUND" : "INTERNAL_ERROR"}</span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={() => window.history.back()}>
            <ArrowLeftIcon className="size-3.5 mr-1.5" />
            返回上一页
          </Button>
          <Button size="sm" asChild>
            <Link to="/app">
              <HomeIcon className="size-3.5 mr-1.5" />
              返回首页
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.location.reload()}
          >
            <RefreshCwIcon className="size-3.5 mr-1.5" />
            刷新页面
          </Button>
        </div>

        {/* Footer hint */}
        <p className="text-xs text-muted-foreground/50 pt-4">
          如果问题持续存在，请联系管理员或{" "}
          <button
            className="underline underline-offset-2 hover:text-foreground transition-colors"
            onClick={() => {
              /* TODO: open bug report dialog */
            }}
          >
            报告问题
          </button>
        </p>
      </div>
    </div>
  )
}
