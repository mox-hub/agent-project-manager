"use client"

import { CheckboxGroup as CheckboxGroupPrimitive } from "@base-ui/react/checkbox-group"
import type React from "react"
import { cn } from "@/lib/utils"

/* coss ui CheckboxGroup（base-ui 配方移植，registry @coss/checkbox-group）*/

export function CheckboxGroup({
  className,
  ...props
}: CheckboxGroupPrimitive.Props): React.ReactElement {
  return (
    <CheckboxGroupPrimitive
      className={cn("flex flex-col items-start gap-3", className)}
      {...props}
    />
  )
}

export { CheckboxGroupPrimitive }
