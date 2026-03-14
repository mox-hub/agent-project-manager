"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function RadioGroup({ children, ...props }: React.ComponentProps<"div">) {
  return <div role="radiogroup" {...props}>{children}</div>
}

function RadioGroupItem({ ...props }: React.ComponentProps<"input">) {
  return <input type="radio" {...props} />
}

export { RadioGroup, RadioGroupItem }
