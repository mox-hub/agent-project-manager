import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useNavigate } from "react-router-dom"
import type { LucideIcon } from "lucide-react"
import { CommandDialog, CommandEmpty, CommandFooter, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command"
import { useTranslation } from "@/hooks/useTranslation"
import { useGlobalHotkey } from "@/shared/hotkeys/use-global-hotkey"
import { OPEN_COMMAND_PALETTE_EVENT } from "./open-command-palette-event"

// 兼容既有消费方（TabBar 等）从 provider 模块取事件名
export { OPEN_COMMAND_PALETTE_EVENT }

export type CommandPaletteItem = {
  id: string
  label: string
  keywords?: string[]
  shortcut?: string
  group?: string
  to?: string
  /** 条目图标（shell-layout 已从 entity-icons/注册表解析），缺省无图标 */
  icon?: LucideIcon
  onSelect?: () => void
}

type CommandPaletteContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  registerCommands: (scope: string, items: CommandPaletteItem[]) => () => void
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null)

function matches(item: CommandPaletteItem, query: string) {
  if (!query) return true
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  if (item.label.toLowerCase().includes(normalized)) return true
  return (item.keywords ?? []).some((keyword) => keyword.toLowerCase().includes(normalized))
}

export function CommandPaletteProvider({
  children,
  initialCommands = [],
}: {
  children: ReactNode
  initialCommands?: CommandPaletteItem[]
}) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [registry, setRegistry] = useState<Record<string, CommandPaletteItem[]>>({})

  const registerCommands = useCallback((scope: string, items: CommandPaletteItem[]) => {
    setRegistry((prev) => ({ ...prev, [scope]: items }))
    return () => {
      setRegistry((prev) => {
        const next = { ...prev }
        delete next[scope]
        return next
      })
    }
  }, [])

  // 全局快捷键走注册表（CAP-A-17）：缺省 mod+k，用户可在设置 · 快捷键改键；
  // 旧 Ctrl+/ 双键随收编移除（help 页本就误写、单一键位足够）
  useGlobalHotkey('command-palette', () => setOpen((prev) => !prev))

  // TabBar「+」等外部入口通过 CustomEvent 请求打开面板（此前派发无监听者，按钮点击无效）
  useEffect(() => {
    const handleOpenEvent = () => setOpen(true)
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, handleOpenEvent)
    return () => window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, handleOpenEvent)
  }, [])

  const items = useMemo(
    () =>
      [...initialCommands, ...Object.values(registry).flat()].filter((item) =>
        matches(item, query)
      ),
    [initialCommands, query, registry]
  )

  const grouped = useMemo(() => {
    const bucket = new Map<string, CommandPaletteItem[]>()
    for (const item of items) {
      const group = item.group ?? t('commandPalette.ungrouped')
      const arr = bucket.get(group) ?? []
      arr.push(item)
      bucket.set(group, arr)
    }
    return Array.from(bucket.entries())
  }, [items, t])

  const value = useMemo(
    () => ({
      open,
      setOpen,
      registerCommands,
    }),
    [open, registerCommands]
  )

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t('commandPalette.title')}
        description={t('commandPalette.description')}
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={t('commandPalette.placeholder')}
        />
        <CommandList>
          <CommandEmpty>{t('commandPalette.empty')}</CommandEmpty>
          {grouped.map(([group, groupItems]) => (
            <CommandGroup key={group} heading={group}>
              {groupItems.map((item) => {
                const Icon = item.icon
                return (
                  <CommandItem
                    key={item.id}
                    onSelect={() => {
                      if (item.to) {
                        navigate(item.to)
                      }
                      item.onSelect?.()
                      setOpen(false)
                      setQuery("")
                    }}
                  >
                    {Icon ? <Icon className="text-muted-foreground" /> : null}
                    <span>{item.label}</span>
                    {item.shortcut ? (
                      <CommandShortcut>{item.shortcut}</CommandShortcut>
                    ) : null}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          ))}
        </CommandList>
        <CommandFooter />
      </CommandDialog>
    </CommandPaletteContext.Provider>
  )
}

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext)
  if (!context) {
    throw new Error("useCommandPalette must be used within CommandPaletteProvider")
  }
  return context
}
