"use client"

import * as React from "react"
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu"

import { cn } from "@/lib/utils"
import { ChevronRightIcon } from "lucide-react"
import { Kbd } from "@/components/ui/kbd"
import {
  MENU_ITEM_BASE_CLASS,
  MENU_POPUP_CLASS,
  MENU_SEPARATOR_CLASS,
  MENU_GROUP_LABEL_CLASS,
} from "@/components/ui/menu"

/*
 * 右键菜单：base-ui ContextMenu 原语（右键定位原生支持）
 * + coss ui Menu 设计（弹出层/条目样式与 ui/menu.tsx 同源）。
 */

function ContextMenuRoot({ ...props }: ContextMenuPrimitive.Root.Props) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />
}

function ContextMenuPortal({ ...props }: ContextMenuPrimitive.Portal.Props) {
  return (
    <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />
  )
}

function ContextMenuTrigger({
  className,
  ...props
}: ContextMenuPrimitive.Trigger.Props) {
  return (
    <ContextMenuPrimitive.Trigger
      data-slot="context-menu-trigger"
      className={cn("select-none", className)}
      {...props}
    />
  )
}

function ContextMenuContent({
  className,
  children,
  ...props
}: ContextMenuPrimitive.Popup.Props) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Positioner
        className="z-50 outline-none"
        sideOffset={4}
      >
        <ContextMenuPrimitive.Popup
          data-slot="context-menu-content"
          className={cn(MENU_POPUP_CLASS, className)}
          {...props}
        >
          <div className="max-h-(--available-height) w-full overflow-y-auto p-1">
            {children}
          </div>
        </ContextMenuPrimitive.Popup>
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  )
}

function ContextMenuGroup({ ...props }: ContextMenuPrimitive.Group.Props) {
  return (
    <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />
  )
}

function ContextMenuLabel({
  className,
  ...props
}: ContextMenuPrimitive.GroupLabel.Props) {
  return (
    <ContextMenuPrimitive.GroupLabel
      data-slot="context-menu-label"
      className={cn(MENU_GROUP_LABEL_CLASS, className)}
      {...props}
    />
  )
}

function ContextMenuItem({
  className,
  variant = "default",
  ...props
}: ContextMenuPrimitive.Item.Props & {
  variant?: "default" | "destructive"
}) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-variant={variant}
      className={cn(
        MENU_ITEM_BASE_CLASS,
        "text-sm data-[variant=destructive]:text-destructive data-[variant=destructive]:data-highlighted:bg-destructive/10 data-[variant=destructive]:data-highlighted:text-destructive",
        className
      )}
      {...props}
    />
  )
}

function ContextMenuSub({ ...props }: ContextMenuPrimitive.SubmenuRoot.Props) {
  return (
    <ContextMenuPrimitive.SubmenuRoot data-slot="context-menu-sub" {...props} />
  )
}

function ContextMenuSubTrigger({
  className,
  children,
  ...props
}: ContextMenuPrimitive.SubmenuTrigger.Props) {
  return (
    <ContextMenuPrimitive.SubmenuTrigger
      data-slot="context-menu-sub-trigger"
      className={cn(
        "flex min-h-8 w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1 text-sm text-foreground outline-none data-disabled:pointer-events-none data-highlighted:bg-accent data-popup-open:bg-accent data-highlighted:text-accent-foreground data-popup-open:text-accent-foreground data-disabled:opacity-64 [&>svg:not(:last-child)]:-mx-0.5 [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ms-auto -me-0.5 opacity-80" />
    </ContextMenuPrimitive.SubmenuTrigger>
  )
}

function ContextMenuSubContent({
  className,
  children,
  ...props
}: ContextMenuPrimitive.Popup.Props) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Positioner
        className="z-50 outline-none"
        side="inline-end"
        sideOffset={0}
        align="start"
        alignOffset={-5}
      >
        <ContextMenuPrimitive.Popup
          data-slot="context-menu-sub-content"
          className={cn(MENU_POPUP_CLASS, className)}
          {...props}
        >
          <div className="max-h-(--available-height) w-full overflow-y-auto p-1">
            {children}
          </div>
        </ContextMenuPrimitive.Popup>
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  )
}

function ContextMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: ContextMenuPrimitive.CheckboxItem.Props) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
      className={cn(
        "grid min-h-8 cursor-default select-none items-center gap-2 rounded-sm py-1 ps-2 pe-4 text-sm text-foreground outline-none grid-cols-[.75rem_1fr] data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-64 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      checked={checked}
      {...props}
    >
      <ContextMenuPrimitive.CheckboxItemIndicator className="col-start-1 -ms-0.5">
        <svg
          aria-hidden="true"
          fill="none"
          height="24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M5.252 12.7 10.2 18.63 18.748 5.37" />
        </svg>
      </ContextMenuPrimitive.CheckboxItemIndicator>
      <span className="col-start-2">{children}</span>
    </ContextMenuPrimitive.CheckboxItem>
  )
}

function ContextMenuRadioGroup({
  ...props
}: ContextMenuPrimitive.RadioGroup.Props) {
  return (
    <ContextMenuPrimitive.RadioGroup
      data-slot="context-menu-radio-group"
      {...props}
    />
  )
}

function ContextMenuRadioItem({
  className,
  children,
  ...props
}: ContextMenuPrimitive.RadioItem.Props) {
  return (
    <ContextMenuPrimitive.RadioItem
      data-slot="context-menu-radio-item"
      className={cn(
        "grid min-h-8 cursor-default select-none items-center gap-2 rounded-sm py-1 ps-2 pe-4 text-sm text-foreground outline-none grid-cols-[.75rem_1fr] data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-64 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      <ContextMenuPrimitive.RadioItemIndicator className="col-start-1 -ms-0.5">
        <svg
          aria-hidden="true"
          fill="none"
          height="24"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M5.252 12.7 10.2 18.63 18.748 5.37" />
        </svg>
      </ContextMenuPrimitive.RadioItemIndicator>
      <span className="col-start-2">{children}</span>
    </ContextMenuPrimitive.RadioItem>
  )
}

function ContextMenuSeparator({
  className,
  ...props
}: ContextMenuPrimitive.Separator.Props) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn(MENU_SEPARATOR_CLASS, className)}
      {...props}
    />
  )
}

function ContextMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn("ms-auto", className)}
      {...props}
    />
  )
}

export {
  ContextMenu,
  ContextMenuRoot,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
}

/* ============================================
   元数据驱动兼容层（历史 API，构建于官方 parts 之上）
   消费方：data-list / tab-bar / *-simple-list / row-context-menu
   升级官方组件时保留本节。
   ============================================ */

export interface MenuItem {
  id: string
  label: React.ReactNode
  icon?: React.ReactNode
  shortcut?: string
  /** 行尾右对齐内容（如选中态对勾） */
  trailing?: React.ReactNode
  disabled?: boolean
  destructive?: boolean
  onClick?: () => void
  children?: MenuItem[]
  separatorAfter?: boolean
}

interface ContextMenuProps {
  children?: React.ReactNode
  items?: MenuItem[]
  onItemClick?: (item: MenuItem) => void
  className?: string
}

let menuIdCounter = 0
function genMenuId() {
  menuIdCounter += 1
  return `menu-${menuIdCounter}`
}

export function createMenuItems(
  config: Array<{
    label: React.ReactNode
    icon?: React.ReactNode
    shortcut?: string
    disabled?: boolean
    destructive?: boolean
    onClick?: () => void
    separatorAfter?: boolean
    children?: Array<{
      label: React.ReactNode
      icon?: React.ReactNode
      shortcut?: string
      disabled?: boolean
      destructive?: boolean
      onClick?: () => void
    }>
  }>
): MenuItem[] {
  return config.map((item) => ({
    id: genMenuId(),
    ...item,
    children: item.children?.map((child) => ({
      id: genMenuId(),
      ...child,
    })),
  }))
}

function MenuItemRow({
  item,
  onItemClick,
}: {
  item: MenuItem
  onItemClick?: (item: MenuItem) => void
}) {
  return (
    <ContextMenuItem
      disabled={item.disabled}
      variant={item.destructive ? "destructive" : "default"}
      onClick={() => {
        item.onClick?.()
        onItemClick?.(item)
      }}
      className={cn(
        "gap-2 data-disabled:opacity-50",
        item.destructive &&
          "text-destructive data-highlighted:text-destructive"
      )}
    >
      {item.icon ? (
        <span className="flex size-4 shrink-0 items-center justify-center">
          {item.icon}
        </span>
      ) : null}
      <span className="flex-1 truncate">{item.label}</span>
      {item.trailing ?? null}
      {item.shortcut ? (
        <ContextMenuShortcut>
          <Kbd>{item.shortcut}</Kbd>
        </ContextMenuShortcut>
      ) : null}
    </ContextMenuItem>
  )
}

function renderMenuItems(items: MenuItem[], onItemClick?: (item: MenuItem) => void) {
  return items.map((item) => (
    <React.Fragment key={item.id}>
      {item.children?.length ? (
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2">
            {item.icon ? (
              <span className="flex size-4 shrink-0 items-center justify-center">{item.icon}</span>
            ) : null}
            <span className="flex-1 truncate">{item.label}</span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {renderMenuItems(item.children, onItemClick)}
          </ContextMenuSubContent>
        </ContextMenuSub>
      ) : (
        <MenuItemRow item={item} onItemClick={onItemClick} />
      )}
      {item.separatorAfter ? <ContextMenuSeparator /> : null}
    </React.Fragment>
  ))
}

function ContextMenu({ children, items = [], onItemClick }: ContextMenuProps) {
  // className 仅作历史 API 兼容保留：旧包裹层时代用于 display:contents，
  // 现在若转发给 popup 会令其 display:contents，背景/边框/阴影全部失效
  // 注意：本层用 cloneElement 把右键菜单 props（含 ref）注入 children——children 必须是
  // DOM 元素或能透传 props/ref 的组件。children 自带触发器 ref 时会被覆盖（如把 hover
  // 卡 props 直接展开在 div 上再交给本层克隆），嵌套其它 cloneElement 型包装时应让它
  // 克隆一个「转发 props 的组件」（参考 tab-bar 的 RoutePreviewTrigger 用法）。
  return (
    <ContextMenuRoot>
      <ContextMenuTrigger
        render={(triggerProps: Record<string, unknown>) =>
          React.isValidElement(children)
            ? // cloneElement 的 props 是整体覆盖语义：trigger 自带 className（select-none）
              // 会吃掉子元素自身的布局类（如 flex），必须显式合并
              React.cloneElement(children, {
                ...triggerProps,
                className: cn(
                  (children.props as { className?: string }).className,
                  triggerProps.className as string | undefined,
                ),
              } as never)
            : React.cloneElement(<div>{children}</div>, triggerProps as never)
        }
      />
      <ContextMenuContent>{renderMenuItems(items, onItemClick)}</ContextMenuContent>
    </ContextMenuRoot>
  )
}
