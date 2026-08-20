"use client"

import * as React from "react"
import { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import {
  MENU_ITEM_CLASS,
  MENU_SEPARATOR_CLASS,
} from "@/components/ui/menu-surface"
import { cn } from "@/lib/utils"
import { Kbd } from "@/components/ui/kbd"
import { ChevronRightIcon } from "lucide-react"

/* ============================================
   Shared State — bridges Trigger (config) and Portal (position)
   ============================================ */

interface SharedMenuState {
  position: { x: number; y: number }
  menuItems: MenuItem[]
  onItemClick: (item: MenuItem) => void
  onClose: () => void
}

const MenuStateContext = createContext<SharedMenuState | null>(null)

function useMenuState() {
  const ctx = useContext(MenuStateContext)
  if (!ctx) throw new Error("ContextMenu must be used within a ContextMenu root")
  return ctx
}

/* ============================================
   Types
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

/* ============================================
   ContextMenu — Root container
   ============================================ */

function ContextMenu({ children, items, onItemClick: externalOnItemClick, className }: ContextMenuProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const mounted = typeof document !== "undefined"

  // Config mode: derive menuItems from items prop
  const configMenuItems = useMemo<MenuItem[]>(() => items ?? [], [items])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (items) setMenuItems(items)
      setPosition({ x: e.clientX, y: e.clientY })
      setOpen(true)
    },
    [items]
  )

  const onItemClick = useCallback(
    (item: MenuItem) => {
      if (item.disabled || item.children?.length) return
      externalOnItemClick?.(item)
      item.onClick?.()
      setOpen(false)
    },
    [externalOnItemClick]
  )

  const onClose = useCallback(() => setOpen(false), [])

  const sharedState: SharedMenuState = useMemo(
    () => ({ position, menuItems: items ? configMenuItems : menuItems, onItemClick, onClose }),
    [position, menuItems, configMenuItems, items, onItemClick, onClose]
  )

  const portal = mounted && open && createPortal(
    <MenuStateContext.Provider value={sharedState}>
      <MenuPortal onClose={onClose} />
    </MenuStateContext.Provider>,
    document.body
  )

  return (
    <MenuStateContext.Provider value={sharedState}>
      <div onContextMenu={handleContextMenu} className={className}>
        {children}
      </div>
      {portal}
    </MenuStateContext.Provider>
  )
}

/* ============================================
   ContextMenuTrigger — Prevents context menu from bubbling
   ============================================ */

function ContextMenuTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className} onContextMenu={(e) => e.stopPropagation()}>
      {children}
    </div>
  )
}

/* ============================================
   ContextMenuContent — Container for compound-mode items
   ============================================ */

function ContextMenuContent({ children }: { children?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "z-[100] min-w-[8.5rem] max-w-[14rem] rounded-[var(--radius-control)]",
        "border border-border bg-popover p-1 shadow-xl",
        "animate-in fade-in-0 zoom-in-95 duration-75"
      )}
      role="menu"
      aria-orientation="vertical"
    >
      {children}
    </div>
  )
}

/* ============================================
   ContextMenuItem — Single menu item
   ============================================ */

interface ContextMenuItemProps extends React.ComponentProps<"button"> {
  destructive?: boolean
  icon?: React.ReactNode
  shortcut?: string
}

function ContextMenuItem({ children, destructive, icon, shortcut, className, ...props }: ContextMenuItemProps) {
  const { onClose } = useMenuState()

  const handleClick = () => {
    if (props.disabled) return
    const userClick = (props as Record<string, unknown>).onClick as (() => void) | undefined
    userClick?.()
    onClose()
  }

  return (
    <button
      className={cn(
        MENU_ITEM_CLASS,
        "w-full gap-2",
        destructive && "text-destructive hover:bg-destructive/10 hover:text-destructive",
        props.disabled && "opacity-50 pointer-events-none cursor-not-allowed",
        className
      )}
      role="menuitem"
      {...props}
      onClick={handleClick}
    >
      <span className="flex items-center gap-2 flex-1">
        {icon && <span className="flex-shrink-0 [&>svg]:size-4">{icon}</span>}
        <span>{children}</span>
      </span>
      {shortcut && <Kbd className="ml-auto shrink-0">{shortcut}</Kbd>}
    </button>
  )
}

function ContextMenuSeparator() {
  return <div className={MENU_SEPARATOR_CLASS} />
}

function ContextMenuLabel({ children, className }: React.ComponentProps<"span">) {
  return (
    <span className={cn("px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground", className)}>
      {children}
    </span>
  )
}

/* ============================================
   MenuPortal — Portal that reads position from shared context
   ============================================ */

function MenuPortal({ onClose }: { onClose: () => void }) {
  const { position, menuItems, onItemClick } = useMenuState()
  const menuRef = useRef<HTMLDivElement>(null)
  const [adjustedPos, setAdjustedPos] = useState(position)

  // Boundary detection
  useEffect(() => {
    const el = menuRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    let x = position.x
    let y = position.y
    if (x + rect.width > vw - 8) x = vw - rect.width - 8
    if (y + rect.height > vh - 8) y = vh - rect.height - 8
    // Boundary detection requires reading DOM dimensions after mount — legitimate use case
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAdjustedPos({ x, y })
  }, [position])

  // Close on outside click / scroll / escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose()
    }
    const handleScroll = () => onClose()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", handleClick, { capture: true })
    document.addEventListener("scroll", handleScroll, { capture: true })
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClick, { capture: true })
      document.removeEventListener("scroll", handleScroll, { capture: true })
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  // Keyboard navigation
  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    const focusableItems = menu.querySelectorAll<HTMLButtonElement>("[role='menuitem']:not([disabled])")
    let focusedIndex = -1
    const handleKeyNav = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        focusedIndex = Math.min(focusedIndex + 1, focusableItems.length - 1)
        focusableItems[focusedIndex]?.focus()
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        focusedIndex = Math.max(focusedIndex - 1, 0)
        focusableItems[focusedIndex]?.focus()
      } else if (e.key === "Enter" && focusedIndex >= 0) {
        e.preventDefault()
        focusableItems[focusedIndex]?.click()
      }
    }
    menu.addEventListener("keydown", handleKeyNav)
    return () => menu.removeEventListener("keydown", handleKeyNav)
  }, [])

  return (
    <div
      ref={menuRef}
      className={cn(
        "fixed z-[100] min-w-[8.5rem] max-w-[14rem] max-h-[320px] overflow-y-auto",
        "rounded-[var(--radius-control)] border border-border bg-popover p-1 shadow-xl",
        "animate-in fade-in-0 zoom-in-95 duration-75"
      )}
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
      role="menu"
      aria-orientation="vertical"
    >
      {menuItems.length > 0
        ? menuItems.map((item) => (
            <MenuItemView key={item.id} item={item} onItemClick={onItemClick} />
          ))
        : null}
    </div>
  )
}

/* ============================================
   MenuItemView — Config-mode menu item renderer
   ============================================ */

function MenuItemView({
  item,
  onItemClick,
}: {
  item: MenuItem
  onItemClick: (item: MenuItem) => void
}) {
  const [subOpen, setSubOpen] = useState(false)
  const [subPos, setSubPos] = useState<{ x: number; y: number } | null>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)

  const openSub = useCallback(() => {
    window.clearTimeout(closeTimer.current)
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const subWidth = 176
    const subHeight = 200
    // 默认在一级菜单项右侧展开；空间不足时翻转到左侧
    let x = rect.right + 4
    if (x + subWidth > window.innerWidth - 8) x = Math.max(8, rect.left - subWidth - 4)
    let y = rect.top
    if (y + subHeight > window.innerHeight - 8) y = Math.max(8, window.innerHeight - subHeight - 8)
    setSubPos({ x, y })
    setSubOpen(true)
  }, [])

  const scheduleClose = useCallback(() => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => {
      setSubOpen(false)
      setSubPos(null)
    }, 150)
  }, [])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  const hasSubMenu = Boolean(item.children?.length)

  if (hasSubMenu) {
    return (
      <div
        ref={anchorRef}
        className="relative"
        onMouseEnter={openSub}
        onMouseLeave={scheduleClose}
      >
        <button
          className={cn(MENU_ITEM_CLASS, "w-full justify-between gap-2", item.disabled && "opacity-50 pointer-events-none")}
          role="menuitem"
          disabled={item.disabled}
          onClick={(e) => { e.stopPropagation(); onItemClick(item) }}
        >
          <span className="flex items-center gap-2">
            {item.icon && (
              <span className={cn("flex-shrink-0", item.destructive && "text-destructive")}>{item.icon}</span>
            )}
            <span className={cn(item.destructive && "text-destructive")}>{item.label}</span>
          </span>
          <ChevronRightIcon className="size-3 text-muted-foreground" />
        </button>
        {subOpen && subPos && createPortal(
          <div
            className="fixed z-[110] max-h-[320px] overflow-y-auto min-w-[8.5rem] max-w-[14rem] rounded-[var(--radius-control)] border border-border bg-popover p-1 shadow-lg"
            style={{ left: subPos.x, top: subPos.y }}
            role="menu"
            onMouseEnter={openSub}
            onMouseLeave={scheduleClose}
          >
            {item.children!.map((child) => (
              <MenuItemView key={child.id} item={child} onItemClick={onItemClick} />
            ))}
          </div>,
          document.body
        )}
      </div>
    )
  }

  return (
    <>
      <button
        className={cn(
          MENU_ITEM_CLASS,
          "w-full gap-2",
          item.disabled && "opacity-50 pointer-events-none cursor-not-allowed",
          item.destructive && "text-destructive hover:bg-destructive/10 hover:text-destructive"
        )}
        role="menuitem"
        disabled={item.disabled}
        onClick={() => onItemClick(item)}
      >
        <span className="flex items-center gap-2 flex-1">
          {item.icon && (
            <span className={cn("flex-shrink-0 [&>svg]:size-4", item.destructive && "text-destructive")}>
              {item.icon}
            </span>
          )}
          <span>{item.label}</span>
        </span>
        {item.shortcut && <Kbd className="ml-auto shrink-0">{item.shortcut}</Kbd>}
        {item.trailing && <span className={cn('shrink-0', item.shortcut ? '' : 'ml-auto')}>{item.trailing}</span>}
      </button>
      {item.separatorAfter && <div className={MENU_SEPARATOR_CLASS} />}
    </>
  )
}

/* ============================================
   Helpers & Hooks
   ============================================ */

let _id = 0
function genId(prefix: string) {
  return `${prefix}-${++_id}`
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
    id: genId("menu"),
    ...item,
    children: item.children?.map((child) => ({
      id: genId("menu"),
      ...child,
    })),
  }))
}

export function useContextMenuState(initialItems: MenuItem[] = []) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [items, setItems] = useState<MenuItem[]>(initialItems)

  const openMenu = useCallback((x: number, y: number, menuItems?: MenuItem[]) => {
    if (menuItems) setItems(menuItems)
    setPosition({ x, y })
    setOpen(true)
  }, [])

  const closeMenu = useCallback(() => setOpen(false), [])

  return { open, position, items, isOpen: open, openMenu, closeMenu, setItems }
}

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
}
export type { ContextMenuProps }
