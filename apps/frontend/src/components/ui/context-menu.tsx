"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  MENU_ITEM_CLASS,
  MENU_LABEL_CLASS,
  MENU_SEPARATOR_CLASS,
  MENU_SURFACE_CLASS,
} from "@/components/ui/menu-surface"

function ContextMenu({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function ContextMenuTrigger({ children, ...props }: React.ComponentProps<"button">) {
  return <button {...props}>{children}</button>
}

function ContextMenuContent({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        MENU_SURFACE_CLASS,
        "p-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function ContextMenuItem({ children, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      className={MENU_ITEM_CLASS}
      {...props}
    >
      {children}
    </button>
  )
}

function ContextMenuLabel({ children, ...props }: React.ComponentProps<"span">) {
  return (
    <span className={MENU_LABEL_CLASS} {...props}>
      {children}
    </span>
  )
}

function ContextMenuSeparator() {
  return <div className={MENU_SEPARATOR_CLASS} />
}

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
}
