"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  MENU_ITEM_CLASS,
  MENU_LABEL_CLASS,
  MENU_SEPARATOR_CLASS,
  MENU_SURFACE_CLASS,
} from "@/components/ui/menu-surface"

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
        MENU_SURFACE_CLASS,
        "z-50",
        "p-1",
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
      className={MENU_ITEM_CLASS}
      {...props}
    >
      {children}
    </button>
  )
}

function DropdownMenuLabel({ children, ...props }: React.ComponentProps<"span">) {
  return (
    <span className={MENU_LABEL_CLASS} {...props}>
      {children}
    </span>
  )
}

function DropdownMenuSeparator() {
  return <div className={MENU_SEPARATOR_CLASS} />
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
