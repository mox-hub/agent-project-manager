"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function TooltipProvider({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function Tooltip({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function TooltipTrigger({ children, ...props }: React.ComponentProps<"button">) {
  return <button {...props}>{children}</button>
}

function TooltipContent({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent }
