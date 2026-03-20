"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Progress({ className, value, ...props }: React.ComponentProps<"div"> & { value?: number }) {
  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      {...props}
    >
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${value || 0}%` }}
      />
    </div>
  )
}

export { Progress }
