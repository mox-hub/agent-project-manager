"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function ToggleGroup({ children, className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-1", className)} {...props}>{children}</div>
}

function ToggleGroupItem({ children, className, ...props }: React.ComponentProps<"button">) {
  return <button className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground", className)} {...props}>{children}</button>
}

export { ToggleGroup, ToggleGroupItem }
