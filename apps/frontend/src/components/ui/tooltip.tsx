"use client"

import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

interface TooltipContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  contentId: string
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null)

function TooltipProvider({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

interface TooltipProps {
  children?: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  delayDuration?: number
}

function Tooltip({ children, open, defaultOpen = false, onOpenChange, delayDuration = 300 }: TooltipProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  const [contentId] = React.useState(() => `tooltip-${Math.random().toString(36).slice(2, 9)}`)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const controlledOpen = open !== undefined ? open : isOpen

  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }, [onOpenChange])

  const show = React.useCallback(() => {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => handleOpenChange(true), delayDuration)
  }, [handleOpenChange, delayDuration])

  const hide = React.useCallback(() => {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => handleOpenChange(false), 100)
  }, [handleOpenChange])

  React.useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  return (
    <TooltipContext.Provider value={{ isOpen: controlledOpen, setIsOpen: handleOpenChange, contentId }}>
      <div
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </div>
    </TooltipContext.Provider>
  )
}

type TooltipTriggerProps = React.ComponentProps<"button"> & {
  asChild?: boolean
}

function TooltipTrigger({ children, asChild, ...props }: TooltipTriggerProps) {
  const context = React.useContext(TooltipContext)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      'aria-describedby': context?.isOpen ? context.contentId : undefined,
    } as React.HTMLAttributes<HTMLElement>)
  }

  return (
    <button {...props} aria-describedby={context?.isOpen ? context.contentId : undefined}>
      {children}
    </button>
  )
}

interface TooltipContentProps extends React.ComponentProps<"div"> {
  side?: 'top' | 'right' | 'bottom' | 'left'
  sideOffset?: number
}

function TooltipContent({ className, children, side = 'top', sideOffset = 4, ...props }: TooltipContentProps) {
  const context = React.useContext(TooltipContext)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })
  const triggerRef = React.useRef<HTMLElement | null>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!context?.isOpen) return

    const updatePosition = () => {
      // 找到 trigger 元素
      const trigger = document.querySelector(`[aria-describedby="${context.contentId}"]`)
      if (!trigger || !contentRef.current) return

      const triggerRect = trigger.getBoundingClientRect()
      const contentRect = contentRef.current.getBoundingClientRect()

      let top = 0
      let left = 0

      switch (side) {
        case 'right':
          top = triggerRect.top + (triggerRect.height - contentRect.height) / 2
          left = triggerRect.right + sideOffset
          break
        case 'left':
          top = triggerRect.top + (triggerRect.height - contentRect.height) / 2
          left = triggerRect.left - contentRect.width - sideOffset
          break
        case 'bottom':
          top = triggerRect.bottom + sideOffset
          left = triggerRect.left + (triggerRect.width - contentRect.width) / 2
          break
        case 'top':
        default:
          top = triggerRect.top - contentRect.height - sideOffset
          left = triggerRect.left + (triggerRect.width - contentRect.width) / 2
          break
      }

      // 边界检查
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      left = Math.max(8, Math.min(left, viewportWidth - contentRect.width - 8))
      top = Math.max(8, Math.min(top, viewportHeight - contentRect.height - 8))

      setPosition({ top, left })
    }

    // 延迟更新位置，等待内容渲染
    const raf = requestAnimationFrame(updatePosition)
    return () => cancelAnimationFrame(raf)
  }, [context?.isOpen, context?.contentId, side, sideOffset])

  if (!context?.isOpen) return null

  return createPortal(
    <div
      ref={contentRef}
      id={context.contentId}
      className={cn(
        "fixed z-[100] overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        className
      )}
      style={{
        top: position.top,
        left: position.left,
      }}
      role="tooltip"
      {...props}
    >
      {children}
    </div>,
    document.body
  )
}

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent }
