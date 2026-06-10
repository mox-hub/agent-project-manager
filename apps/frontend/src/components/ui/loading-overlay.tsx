import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Spinner, type SpinnerSize } from "./spinner"
import { XCircleIcon } from "lucide-react"

/* ============================================
   LoadingOverlay — 通用加载遮罩/进度条
   ============================================ */

export type LoadingMode = "overlay" | "inline" | "bar"

export interface LoadingOverlayProps {
  visible: boolean
  message?: string
  description?: string
  mode?: LoadingMode
  blur?: boolean
  spinnerSize?: SpinnerSize
  className?: string
}

function LoadingOverlay({
  visible,
  message,
  description,
  mode = "overlay",
  blur = true,
  spinnerSize = "lg",
  className,
}: LoadingOverlayProps) {
  if (!visible) return null

  if (mode === "bar") {
    return (
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-[100] h-0.5 overflow-hidden",
          className
        )}
        role="progressbar"
        aria-label={message ?? "加载中"}
      >
        <div className="h-full bg-primary animate-[loading-bar_1.5s_ease-in-out_infinite] origin-left" />
      </div>
    )
  }

  if (mode === "inline") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 py-8",
          className
        )}
        role="status"
        aria-label={message ?? "加载中"}
      >
        <Spinner size={spinnerSize} />
        {message && (
          <p className="text-sm text-muted-foreground font-medium">{message}</p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    )
  }

  // overlay mode (default)
  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4",
        blur && "bg-background/60 backdrop-blur-sm",
        !blur && "bg-background/80",
        className
      )}
      role="status"
      aria-label={message ?? "加载中"}
    >
      <div className="flex flex-col items-center gap-3">
        <Spinner size={spinnerSize} />
        {message && (
          <p className="text-sm font-medium text-foreground animate-pulse">
            {message}
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}

/* ============================================
   ErrorOverlay — 错误提示遮罩（可选，配合 LoadingOverlay 使用）
   ============================================ */

export interface ErrorOverlayProps {
  visible: boolean
  message?: string
  description?: string
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

function ErrorOverlay({
  visible,
  message = "操作失败",
  description,
  onRetry,
  onDismiss,
  className,
}: ErrorOverlayProps) {
  if (!visible) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4",
        "bg-background/80 backdrop-blur-sm",
        className
      )}
      role="alertdialog"
      aria-label={message}
    >
      <div className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-border bg-card shadow-xl max-w-sm text-center">
        <div className="flex items-center justify-center size-12 rounded-full bg-destructive/10">
          <XCircleIcon className="size-6 text-destructive" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">{message}</p>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex gap-2 pt-1">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              重试
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
            >
              关闭
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ============================================
   LoadingContext — 全局加载状态管理
   ============================================ */

interface LoadingContextValue {
  isLoading: boolean
  pendingCount: number
  message?: string
  description?: string
  mode: LoadingMode
  show: (opts?: { message?: string; description?: string; mode?: LoadingMode }) => void
  hide: () => void
  addPending: () => void
  removePending: () => void
}

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined)

export interface LoadingProviderProps {
  children: ReactNode
  /** 初始模式，默认 overlay */
  defaultMode?: LoadingMode
}

function LoadingProvider({ children, defaultMode = "bar" }: LoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [message, setMessage] = useState<string>()
  const [description, setDescription] = useState<string>()
  const [mode, setMode] = useState<LoadingMode>(defaultMode)

  const show = useCallback(
    (opts?: { message?: string; description?: string; mode?: LoadingMode }) => {
      setMessage(opts?.message)
      setDescription(opts?.description)
      if (opts?.mode) setMode(opts.mode)
      setIsLoading(true)
    },
    []
  )

  const hide = useCallback(() => {
    setIsLoading(false)
    setMessage(undefined)
    setDescription(undefined)
  }, [])

  const addPending = useCallback(() => {
    setPendingCount(c => c + 1)
    setIsLoading(true)
    setMode(defaultMode)
  }, [defaultMode])

  const removePending = useCallback(() => {
    setPendingCount(c => {
      const next = Math.max(0, c - 1)
      if (next === 0) {
        setIsLoading(false)
      }
      return next
    })
  }, [])

  return (
    <LoadingContext.Provider
      value={{ isLoading, pendingCount, message, description, mode, show, hide, addPending, removePending }}
    >
      {children}
    </LoadingContext.Provider>
  )
}

function useLoadingContext() {
  const ctx = useContext(LoadingContext)
  if (!ctx) throw new Error("useLoading must be used within LoadingProvider")
  return ctx
}

/** 全局手动控制加载遮罩 */
function useLoading() {
  const ctx = useLoadingContext()
  return {
    isLoading: ctx.isLoading,
    pendingCount: ctx.pendingCount,
    mode: ctx.mode,
    show: ctx.show,
    hide: ctx.hide,
    addPending: ctx.addPending,
    removePending: ctx.removePending,
  }
}

export {
  LoadingOverlay,
  ErrorOverlay,
  LoadingProvider,
  useLoading,
  useLoadingContext,
}
