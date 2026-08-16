"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function ScrollArea({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("relative flex flex-col overflow-hidden", className)} {...props}>
      <div className="flex-1 overflow-y-auto overscroll-y-contain">
        {children}
      </div>
    </div>
  )
}

export { ScrollArea }
