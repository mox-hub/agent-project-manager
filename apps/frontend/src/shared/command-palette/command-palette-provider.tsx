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
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command"
import { useTranslation } from "@/hooks/useTranslation"

/** 外部入口（如 TabBar「+」按钮）请求打开命令面板的 CustomEvent 名 */
export const OPEN_COMMAND_PALETTE_EVENT = "open-command-palette"

export type CommandPaletteItem = {
  id: string
  label: string
  keywords?: string[]
  shortcut?: string
  group?: string
  to?: string
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+K 或 Ctrl+/ 打开命令面板
      if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === 'k' || event.key === '/')) {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

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
              {groupItems.map((item) => (
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
                  <span>{item.label}</span>
                  {item.shortcut ? <CommandShortcut>{item.shortcut}</CommandShortcut> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
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
