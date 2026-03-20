"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function HoverCard({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function HoverCardContent({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function HoverCardTrigger({ children, ...props }: React.ComponentProps<"a">) {
  return <a {...props}>{children}</a>
}

export { HoverCard, HoverCardContent, HoverCardTrigger }
