"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
} from "@/components/ui/input-group"
import { SearchIcon, CheckIcon } from "lucide-react"
import { useTranslation } from "@/hooks/useTranslation"

/** 面板键位徽章统一样式（设计语言与 design-system Command Palette 演示同源） */
const COMMAND_KBD_CLASS =
  "inline-flex h-5 items-center rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-10 text-muted-foreground"

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex size-full flex-col overflow-hidden rounded-xl! bg-transparent p-1 text-popover-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandDialog({
  title,
  description,
  children,
  className,
  showCloseButton = false,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
  children: React.ReactNode
}) {
  // 默认标题/描述走 i18n（调用方未显式传入时生效）
  const { t } = useTranslation()
  const resolvedTitle = title ?? t("commandPalette.title")
  const resolvedDescription = description ?? t("commandPalette.description")
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{resolvedTitle}</DialogTitle>
        <DialogDescription>{resolvedDescription}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn(
          "top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0 shadow-2xl sm:max-w-140!",
          className
        )}
        showCloseButton={showCloseButton}
      >
        {/* cmdk 的 Input/Item/List 依赖 root context 提供的 store,
            缺少 <Command> 包裹时 useSyncExternalStore 拿到 undefined 直接崩溃 */}
        {/* shouldFilter=false：过滤交给 provider（label + keywords），
            cmdk 内置过滤只看条目渲染文本，中文标签会滤掉英文关键词检索 */}
        <Command shouldFilter={false} className="flex-1">{children}</Command>
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="border-b border-border p-2.5 pb-2.5"
    >
      <InputGroup className="h-9! rounded-lg! border-border/50 bg-muted/40 shadow-none!">
        <InputGroupAddon align="inline-start">
          <SearchIcon className="size-4 shrink-0 opacity-50" />
        </InputGroupAddon>
        <CommandPrimitive.Input
          data-slot="command-input"
          className={cn(
            "w-full text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        <InputGroupAddon align="inline-end">
          <kbd className={COMMAND_KBD_CLASS}>ESC</kbd>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "no-scrollbar max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("py-6 text-center text-sm", className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden p-1.5 pt-1 text-foreground **:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-10 **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-wider **:[[cmdk-group-heading]]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("-mx-1 h-px w-auto bg-border", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "group/command-item relative flex cursor-default items-center justify-between gap-3 rounded-md px-3 py-2 text-sm outline-hidden select-none in-data-[slot=dialog-content]:rounded-md! data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-selected:bg-accent data-selected:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-selected:**:[svg]:text-foreground",
        className
      )}
      {...props}
    >
      {children}
      <CheckIcon className="ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100" />
    </CommandPrimitive.Item>
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(COMMAND_KBD_CLASS, "ml-auto shrink-0", className)}
      {...props}
    />
  )
}

/** 底部键位提示栏：↑↓ 导航 / ↵ 选择 / ESC 关闭 + 右侧面板触发键（对齐 design-system 设计语言） */
function CommandFooter() {
  const { t } = useTranslation()
  const isMac =
    typeof navigator !== "undefined" && /Mac|iP(hone|ad|od)/.test(navigator.platform)
  const hints = [
    ["↑↓", t("commandPalette.hintNavigate")],
    ["↵", t("commandPalette.hintSelect")],
    ["ESC", t("commandPalette.hintClose")],
  ] as const
  return (
    <div
      data-slot="command-footer"
      className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2"
    >
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {hints.map(([key, label]) => (
          <div key={key} className="flex items-center gap-1">
            <kbd className={cn(COMMAND_KBD_CLASS, "bg-background")}>{key}</kbd>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <kbd className={cn(COMMAND_KBD_CLASS, "bg-background")}>
        {isMac ? "⌘/" : "Ctrl+/"}
      </kbd>
    </div>
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
  CommandFooter,
}
