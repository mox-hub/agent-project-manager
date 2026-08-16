import { cn } from "@/lib/utils"
import { Spinner } from "./spinner"

/* ============================================
   PageLoader — 路由切换全屏加载页
   ============================================ */

export interface PageLoaderProps {
  message?: string
  className?: string
}

function PageLoader({ message = "加载中...", className }: PageLoaderProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex flex-col items-center justify-center",
        "bg-background/80 backdrop-blur-sm",
        "transition-opacity duration-300",
        className
      )}
      role="status"
      aria-label={message}
    >
      {/* Brand Mark */}
      <div className="flex flex-col items-center gap-5">
        {/* Logo circle */}
        <div className="relative">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-primary shadow-lg">
            <svg
              className="size-7 text-primary-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
              />
            </svg>
          </div>
          {/* Spinner ring overlay */}
          <div className="absolute -inset-1 -z-10">
            <Spinner size="xl" className="text-primary/20" />
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground tracking-wide">
            AgentPM
          </span>
          <span className="text-xs text-muted-foreground animate-pulse">
            {message}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ============================================
   usePageLoader — 路由切换期间自动显示/隐藏 PageLoader
   ============================================ */

import { useEffect, useState } from "react"

function usePageLoader() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const handleBeforeLoad = () => {
      timer = setTimeout(() => setIsVisible(true), 50)
    }

    window.addEventListener("beforeunload", handleBeforeLoad)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeLoad)
      clearTimeout(timer)
    }
  }, [])

  return isVisible
}

export { PageLoader, usePageLoader }
