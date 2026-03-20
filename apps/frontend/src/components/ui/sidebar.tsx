"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Sidebar({
  className,
  ...props
}: React.ComponentProps<"aside">) {
  return (
    <aside
      data-slot="sidebar"
      className={cn("flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground", className)}
      {...props}
    />
  )
}

function SidebarHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("border-b border-sidebar-border px-3 py-3", className)}
      {...props}
    />
  )
}

function SidebarContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("flex-1 overflow-auto", className)}
      {...props}
    />
  )
}

function SidebarFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("border-t border-sidebar-border p-2", className)}
      {...props}
    />
  )
}

function SidebarGroup({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="sidebar-group"
      className={cn("px-1 py-1", className)}
      {...props}
    />
  )
}

function SidebarGroupLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn("px-3 pb-1 text-[11px] uppercase tracking-wide text-sidebar-foreground/50", className)}
      {...props}
    />
  )
}

function SidebarMenu({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      className={cn("m-0 list-none space-y-1 px-1", className)}
      {...props}
    />
  )
}

function SidebarMenuItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-item" className={cn(className)} {...props} />
}

function SidebarMenuButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      data-slot="sidebar-menu-button"
      className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", className)}
      {...props}
    />
  )
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
}
