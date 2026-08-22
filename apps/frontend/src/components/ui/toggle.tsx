"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Toggle({ pressed, onPressedChange, className, ...props }: React.ComponentProps<"button"> & { pressed?: boolean; onPressedChange?: (pressed: boolean) => void }) {
  const [isPressed, setIsPressed] = React.useState(false)
  const controlledPressed = pressed !== undefined ? pressed : isPressed
  const handlePressedChange = onPressedChange || ((pressed) => setIsPressed(pressed))

  return (
    <button
      type="button"
      aria-pressed={controlledPressed}
      data-state={controlledPressed ? "on" : "off"}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
        className
      )}
      onClick={() => handlePressedChange(!controlledPressed)}
      {...props}
    />
  )
}

export { Toggle }
