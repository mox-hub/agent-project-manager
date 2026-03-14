"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Select({ children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        props.className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

function SelectTrigger({ children, ...props }: React.ComponentProps<"button">) {
  return <button {...props}>{children}</button>
}

function SelectValue({ ...props }: React.ComponentProps<"span">) {
  return <span {...props} />
}

function SelectContent({ children, ...props }: React.ComponentProps<"div">) {
  return <div {...props}>{children}</div>
}

function SelectItem({ children, ...props }: React.ComponentProps<"option">) {
  return <option {...props}>{children}</option>
}

function SelectLabel({ children, ...props }: React.ComponentProps<"span">) {
  return <span className="px-2 py-1.5 text-sm font-semibold" {...props}>{children}</span>
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectLabel }
