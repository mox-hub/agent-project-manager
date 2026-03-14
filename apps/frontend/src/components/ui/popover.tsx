"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface PopoverContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null)

function usePopoverContext() {
  const context = React.useContext(PopoverContext)
  if (!context) {
    throw new Error("Popover components must be used within a Popover")
  }
  return context
}

function Popover({ open, onOpenChange, children }: React.ComponentProps<"div"> & { open?: boolean; onOpenChange?: (open: boolean) => void; children?: React.ReactNode }) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen

  const handleOpenChange = React.useCallback(
    (value: boolean) => {
      if (!isControlled) {
        setInternalOpen(value)
      }
      onOpenChange?.(value)
    },
    [isControlled, onOpenChange]
  )

  return (
    <PopoverContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
      {children}
    </PopoverContext.Provider>
  )
}

function PopoverTrigger({ children, asChild, ...props }: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { onOpenChange } = usePopoverContext()

  return (
    <button
      data-slot="popover-trigger"
      onClick={() => onOpenChange(true)}
      {...props}
    >
      {children}
    </button>
  )
}

function PopoverAnchor({ children, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="popover-anchor" {...props}>
      {children}
    </div>
  )
}

function PopoverContent({
  className,
  align = "center",
  side = "bottom",
  sideOffset = 4,
  children,
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<"div"> & {
  align?: "center" | "start" | "end"
  side?: "top" | "bottom" | "left" | "right"
  sideOffset?: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const { open: contextOpen, onOpenChange: contextOnOpenChange } = usePopoverContext()
  const isOpen = open !== undefined ? open : contextOpen
  const handleOpenChange = onOpenChange || contextOnOpenChange
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })

  React.useEffect(() => {
    if (!isOpen || !contentRef.current) return

    const updatePosition = () => {
      const trigger = document.querySelector('[data-slot="popover-trigger"]')
      if (!trigger) return

      const triggerRect = trigger.getBoundingClientRect()
      const content = contentRef.current
      if (!content) return

      let top = 0
      let left = 0

      switch (side) {
        case "bottom":
          top = triggerRect.bottom + sideOffset
          left = triggerRect.left + triggerRect.width / 2
          break
        case "top":
          top = triggerRect.top - sideOffset
          left = triggerRect.left + triggerRect.width / 2
          break
        case "left":
          top = triggerRect.top + triggerRect.height / 2
          left = triggerRect.left - sideOffset
          break
        case "right":
          top = triggerRect.top + triggerRect.height / 2
          left = triggerRect.right + sideOffset
          break
      }

      switch (align) {
        case "start":
          left = triggerRect.left
          break
        case "end":
          left = triggerRect.right
          break
        case "center":
        default:
          break
      }

      setPosition({ top, left })
    }

    updatePosition()
    window.addEventListener("resize", updatePosition)
    return () => window.removeEventListener("resize", updatePosition)
  }, [isOpen, align, side, sideOffset])

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={() => handleOpenChange(false)}
      />
      <div
        ref={contentRef}
        data-slot="popover-content"
        className={cn(
          "z-50 flex w-72 origin-(--transform-origin) flex-col gap-4 rounded-md bg-popover p-4 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden",
          className
        )}
        style={{
          position: "fixed",
          top: position.top,
          left: position.left,
          transform: "translate(-50%, 0)",
        }}
        {...props}
      >
        {children}
      </div>
    </>
  )
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn("flex flex-col gap-1 text-sm", className)}
      {...props}
    />
  )
}

function PopoverTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="popover-title"
      className={cn("font-medium", className)}
      {...props}
    />
  )
}

function PopoverDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="popover-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
}
