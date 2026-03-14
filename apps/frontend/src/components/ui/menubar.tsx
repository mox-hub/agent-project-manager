"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Menubar({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex h-9 items-center gap-1 rounded-md border bg-background p-1 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function MenubarTrigger({ children, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      className="flex cursor-default select-none items-center rounded-sm px-3 py-1 text-sm font-medium outline-none hover:bg-accent hover:text-accent-foreground data-[active]:bg-accent data-[active]:text-accent-foreground"
      {...props}
    >
      {children}
    </button>
  )
}

function MenubarContent({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function MenubarItem({ children, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
      {...props}
    >
      {children}
    </button>
  )
}

function MenubarSeparator() {
  return <div className="-mx-1 my-1 h-px bg-muted" />
}

function MenubarLabel({ children, ...props }: React.ComponentProps<"span">) {
  return <span className="px-2 py-1.5 text-sm font-semibold" {...props}>{children}</span>
}

export {
  Menubar,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
}
