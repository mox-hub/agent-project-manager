"use client"

import * as React from "react"
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { SearchIcon, CheckIcon } from "lucide-react"

function Command({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="command"
      className={cn(
        "flex flex-col overflow-hidden rounded-xl bg-popover p-1 text-popover-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandDialog({
  open,
  onOpenChange,
  title = "Command Palette",
  children,
  className,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  className?: string
  children: React.ReactNode
}) {
  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 isolate z-50 bg-black/50" />
        <div
          data-slot="dialog-content"
          className={cn(
            "fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 gap-4 rounded-xl border border-border/60 bg-background p-4 shadow-xl",
            className
          )}
          role="dialog"
          aria-modal="true"
        >
          {children}
        </div>
      </DialogPortal>
    </Dialog>
  )
}

function CommandInput({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div data-slot="command-input-wrapper" className="p-1 pb-0">
      <InputGroup className="h-8! rounded-lg! border-input/30 bg-input/30 shadow-none!">
        <Input
          data-slot="command-input"
          className={cn(
            "h-8 flex-1 bg-transparent text-sm outline-hidden placeholder:text-muted-foreground",
            className
          )}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
        />
        <InputGroupAddon>
          <SearchIcon className="size-4 shrink-0 opacity-50" />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function CommandList({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="command-list"
      className={cn(
        "no-scrollbar max-h-72 overflow-y-auto py-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function CommandEmpty({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="command-empty"
      className={cn("py-6 text-center text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function CommandGroup({
  className,
  heading,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { heading?: string }) {
  return (
    <div data-slot="command-group" className={cn("overflow-hidden p-1", className)} {...props}>
      {heading && (
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {heading}
        </div>
      )}
      {children}
    </div>
  )
}

function CommandSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="command-separator"
      className={cn("-mx-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  children,
  selected,
  onSelect,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  selected?: boolean
  onSelect?: () => void
}) {
  return (
    <div
      data-slot="command-item"
      data-selected={selected}
      className={cn(
        "group/command-item relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
        "hover:bg-muted",
        "data-[selected=true]:bg-muted",
        "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
        className
      )}
      onClick={onSelect}
      {...props}
    >
      {children}
    </div>
  )
}

function CommandShortcut({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
