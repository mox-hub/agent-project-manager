"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  MENU_ITEM_CLASS,
  MENU_LABEL_CLASS,
  MENU_SEPARATOR_CLASS,
  MENU_SURFACE_CLASS,
} from "@/components/ui/menu-surface"

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

function MenubarItem({ children, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      className={MENU_ITEM_CLASS}
      {...props}
    >
      {children}
    </button>
  )
}

function MenubarSeparator() {
  return <div className={MENU_SEPARATOR_CLASS} />
}

function MenubarLabel({ children, ...props }: React.ComponentProps<"span">) {
  return <span className={MENU_LABEL_CLASS} {...props}>{children}</span>
}

export {
  Menubar,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
}
