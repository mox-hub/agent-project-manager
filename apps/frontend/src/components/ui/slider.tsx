"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Slider({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="range"
      className={cn(
        "flex h-2 w-full touch-none select-none items-center rounded-full bg-muted",
        className
      )}
      {...props}
    />
  )
}

export { Slider }
