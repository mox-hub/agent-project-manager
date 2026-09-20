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
import { useQuery } from "@tanstack/react-query"
import type { LucideIcon } from "lucide-react"
import { CommandDialog, CommandEmpty, CommandFooter, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command"
import { useTranslation } from "@/hooks/useTranslation"
import { useGlobalHotkey } from "@/shared/hotkeys/use-global-hotkey"
import { useDebouncedCallback } from "@/shared/hooks/use-debounced-callback"
import { getEntityIcon, type EntityKind } from "@/shared/entity-icons/entity-icons"
import { searchApi, type SearchResultType } from "@/modules/search/api/search-api"
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

// —— 实体搜索（P1-13）：面板输入经防抖后走 /search，命中以「搜索结果」分组渲染 ——
const ENTITY_SEARCH_DEBOUNCE_MS = 300
/** 面板只搜有详情路由的实体：工单（task/bug）与项目；后端对未知类别返回空分组 */
const ENTITY_SEARCH_TYPES: SearchResultType[] = ['task', 'bug', 'project']
const ENTITY_SEARCH_LIMIT = 8
/** /search 命中类型 → entity-icons 注册表（单一图标真相源） */
const SEARCH_HIT_ENTITY: Record<SearchResultType, EntityKind> = {
  task: 'issue',
  bug: 'bug',
  document: 'document',
  project: 'project',
  milestone: 'issue',
  acceptance: 'issue',
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

  // 实体搜索：输入防抖后另存一份查询词（不参与命令过滤），命令过滤仍走 query
  const [entityQuery, setEntityQuery] = useState("")
  const scheduleEntitySearch = useDebouncedCallback((value: string) => {
    setEntityQuery(value)
  }, ENTITY_SEARCH_DEBOUNCE_MS)
  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value)
      scheduleEntitySearch(value)
    },
    [scheduleEntitySearch]
  )
  const trimmedEntityQuery = entityQuery.trim()

  const { data: searchData, isFetching: searchFetching } = useQuery({
    queryKey: ['command-palette', 'entity-search', trimmedEntityQuery],
    queryFn: ({ signal }) =>
      searchApi.search(
        { q: trimmedEntityQuery, types: ENTITY_SEARCH_TYPES, limit: ENTITY_SEARCH_LIMIT },
        { signal },
      ),
    // 面板关闭或无查询词不发起；重开面板时 react-query 缓存先出旧数据再后台刷新
    enabled: open && trimmedEntityQuery.length > 0,
    staleTime: 30_000,
  })

  const searchItems = useMemo<CommandPaletteItem[]>(() => {
    const hits = searchData?.items ?? []
    if (hits.length === 0) return []
    const groupLabel = t('commandPalette.searchResults', '搜索结果')
    return hits.map((hit) => ({
      id: `search-hit-${hit.id}`,
      label: hit.title,
      keywords: [hit.subtitle, hit.type],
      group: groupLabel,
      // 后端已产出实体详情路由（/app/issues/:id、/app/projects/:id 等），点击直达
      to: hit.path,
      icon: getEntityIcon(SEARCH_HIT_ENTITY[hit.type] ?? 'issue').icon,
    }))
  }, [searchData, t])

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
          onValueChange={handleQueryChange}
          placeholder={t('commandPalette.placeholder')}
        />
        <CommandList>
          <CommandEmpty>{t('commandPalette.empty')}</CommandEmpty>
          {searchItems.length > 0 ? (
            // 「搜索结果」分组置顶：命中项复用 CommandItem 渲染管线（to → navigate），
            // 不走 matches 过滤（服务端已按查询词过滤，标题未必包含原文）
            <CommandGroup heading={t('commandPalette.searchResults', '搜索结果')}>
              {searchItems.map((item) => {
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
                      setEntityQuery("")
                    }}
                  >
                    {Icon ? <Icon className="text-muted-foreground" /> : null}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          ) : null}
          {!searchFetching && searchItems.length === 0 ? (
            // 空态提示：说明面板除命令外还支持搜工单/项目（键缺失时给中文兜底，locale 补键见需求单）
            <div
              className="px-3 py-2 text-xs text-muted-foreground"
              data-testid="palette-entity-search-hint"
            >
              {t('commandPalette.searchHint', '输入以搜索工单/项目')}
            </div>
          ) : null}
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
                      setEntityQuery("")
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
