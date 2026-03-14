"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function DropdownMenu({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function DropdownMenuTrigger({ children, ...props }: React.ComponentProps<"button">) {
  return <button {...props}>{children}</button>
}

function DropdownMenuContent({ className, children, ...props }: React.ComponentProps<"div">) {
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

function DropdownMenuItem({ children, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
      {...props}
    >
      {children}
    </button>
  )
}

function DropdownMenuLabel({ children, ...props }: React.ComponentProps<"span">) {
  return (
    <span className="px-2 py-1.5 text-sm font-semibold" {...props}>
      {children}
    </span>
  )
}

function DropdownMenuSeparator() {
  return <div className="-mx-1 my-1 h-px bg-muted" />
}

function DropdownMenuGroup({ children, ...props }: React.ComponentProps<"div">) {
  return <div {...props}>{children}</div>
}

function DropdownMenuSubMenu({ children, ...props }: React.ComponentProps<"div">) {
  return <div {...props}>{children}</div>
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuSubMenu,
}
