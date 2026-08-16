"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Collapsible({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {children}
    </div>
  )
}

function CollapsibleTrigger({ className, children, ...props }: React.ComponentProps<"button">) {
  return (
    <button className={cn("", className)} {...props}>
      {children}
    </button>
  )
}

function CollapsibleContent({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
