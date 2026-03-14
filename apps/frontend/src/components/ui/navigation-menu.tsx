"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function NavigationMenu({ children, ...props }: React.ComponentProps<"nav">) {
  return <nav {...props}>{children}</nav>
}

function NavigationMenuList({ children, ...props }: React.ComponentProps<"ul">) {
  return <ul className="flex flex-1 items-center gap-1" {...props}>{children}</ul>
}

function NavigationMenuItem({ children, ...props }: React.ComponentProps<"li">) {
  return <li {...props}>{children}</li>
}

function NavigationMenuLink({ children, ...props }: React.ComponentProps<"a">) {
  return <a className="block select-none rounded-md px-3 py-2 no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground" {...props}>{children}</a>
}

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
}
