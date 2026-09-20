import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import ReactMarkdown from "react-markdown"
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  CircleHelpIcon,
  CornerDownLeftIcon,
  SearchIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react"
import {
  Command,
  CommandDialog,
  CommandDialogPopup,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandCollection,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel,
  CommandShortcut,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useAutocompleteFilter } from "@/components/ui/autocomplete"
import { useTranslation } from "@/hooks/useTranslation"
import { useGlobalHotkey } from "@/shared/hotkeys/use-global-hotkey"
import { getEffectiveCombo } from "@/shared/hotkeys/hotkey-store"
import { formatComboForDisplay } from "@/shared/hotkeys/hotkey-utils"
import { useDebouncedCallback } from "@/shared/hooks/use-debounced-callback"
import {
  getEntityIcon,
  getEntityIconTextClass,
  type EntityKind,
} from "@/shared/entity-icons/entity-icons"
import { searchApi, type SearchResultType } from "@/modules/search/api/search-api"
import { assistantApi } from "@/modules/assistant/api/assistant-api"
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
  /** 图标品牌色（page-registry hex，与侧边栏同源）；缺省回退 muted */
  iconColor?: string
  onSelect?: () => void
}

/** 引擎过滤用条目形态：搜索命中绕过本地过滤（服务端已按查询词筛过） */
type PaletteEntry = CommandPaletteItem & {
  isSearchHit?: boolean
  /** 搜索命中实体的语义色 class（entity-icons tone 词表） */
  iconToneClass?: string
}

/** Root items 要求的分组形态（value 为分组标识，label 为已翻译标题） */
type PaletteGroup = { value: string; label: string; items: PaletteEntry[] }

/** 面板内嵌轻量 AI 问答（coss p-command-2 同构）：一次一问，回答落在助手会话历史 */
type AiAskState = {
  /** AI 模式（搜索 ↔ 问答 双模） */
  active: boolean
  input: string
  submitted: string
  response: string
  /** sync=同步终文；runtime=已转交 CLI 同事异步回流 */
  channel: "sync" | "runtime" | null
  isGenerating: boolean
  error: string | null
  /** 相关页面：以问题词复用 /search 的真实命中（无则不渲染） */
  refs: Array<{ id: string; title: string; path: string }>
}

const AI_IDLE: AiAskState = {
  active: false,
  input: "",
  submitted: "",
  response: "",
  channel: null,
  isGenerating: false,
  error: null,
  refs: [],
}

type CommandPaletteContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  registerCommands: (scope: string, items: CommandPaletteItem[]) => () => void
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null)

// —— 实体搜索（P1-13）：面板输入经防抖后走 /search，命中以「搜索结果」分组渲染 ——
const ENTITY_SEARCH_DEBOUNCE_MS = 300
/** 面板只搜有详情路由的实体：工单（task/bug）与项目；后端对未知类别返回空分组 */
const ENTITY_SEARCH_TYPES: SearchResultType[] = ['task', 'bug', 'project']
const ENTITY_SEARCH_LIMIT = 8
/** AI 相关页面引用：问题词搜文档/工单/项目，取前 3 条真实命中 */
const AI_REF_TYPES: SearchResultType[] = ['document', 'task', 'bug', 'project']
const AI_REF_LIMIT = 3
/** Ctrl+1..9 快速选择：可见条目前 N 项（coss 官方 shortcut 列同思路，改键位直达） */
const QUICK_SELECT_SLOTS = 9
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
  const [ai, setAi] = useState<AiAskState>(AI_IDLE)
  const aiAbortRef = useRef<AbortController | null>(null)

  // 实体搜索：输入防抖后另存一份查询词（不参与命令过滤），命令过滤交给 base-ui 引擎
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
    enabled: open && !ai.active && trimmedEntityQuery.length > 0,
    staleTime: 30_000,
  })

  const searchItems = useMemo<PaletteEntry[]>(() => {
    const hits = searchData?.items ?? []
    if (hits.length === 0) return []
    return hits.map((hit) => ({
      id: `search-hit-${hit.id}`,
      label: hit.title,
      keywords: [hit.subtitle, hit.type],
      group: t('commandPalette.searchResults', '搜索结果'),
      // 后端已产出实体详情路由（/app/issues/:id、/app/projects/:id 等），点击直达
      to: hit.path,
      icon: getEntityIcon(SEARCH_HIT_ENTITY[hit.type] ?? 'issue').icon,
      iconToneClass: getEntityIconTextClass(SEARCH_HIT_ENTITY[hit.type] ?? 'issue'),
      isSearchHit: true,
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

  // 全局快捷键走注册表（CAP-A-17）：缺省 mod+k，用户可在设置 · 快捷键改键
  useGlobalHotkey('command-palette', () => setOpen((prev) => !prev))

  // TabBar「+」等外部入口通过 CustomEvent 请求打开面板
  useEffect(() => {
    const handleOpenEvent = () => setOpen(true)
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, handleOpenEvent)
    return () => window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, handleOpenEvent)
  }, [])

  const commandItems = useMemo<PaletteEntry[]>(
    () => [...initialCommands, ...Object.values(registry).flat()],
    [initialCommands, registry]
  )

  const resetTransient = useCallback(() => {
    setQuery("")
    setEntityQuery("")
  }, [])

  const closePalette = useCallback(() => {
    aiAbortRef.current?.abort()
    setOpen(false)
    setAi(AI_IDLE)
    resetTransient()
  }, [resetTransient])

  const handleSelect = useCallback(
    (item: PaletteEntry) => {
      if (item.to) {
        navigate(item.to)
      }
      item.onSelect?.()
      closePalette()
    },
    [closePalette, navigate]
  )

  // —— base-ui 过滤引擎：accent/大小写不敏感的 contains（coss p-command 同款配置）——
  const { contains } = useAutocompleteFilter({ sensitivity: "base" })
  const filterItem = useCallback(
    (itemValue: unknown, itemQuery: string): boolean => {
      const item = itemValue as PaletteEntry
      // 搜索命中为服务端过滤结果，标题未必包含原文，恒放行
      if (item.isSearchHit) return true
      if (!itemQuery.trim()) return true
      if (contains(item.label, itemQuery)) return true
      return (item.keywords ?? []).some((keyword) => contains(keyword, itemQuery))
    },
    [contains]
  )

  // 分组：搜索命中置顶，其余按声明顺序；空查询外按引擎同款规则预滤，空组不渲染标题
  const paletteGroups = useMemo<PaletteGroup[]>(() => {
    const trimmed = query.trim()
    const bucket = new Map<string, PaletteEntry[]>()
    for (const item of [...searchItems, ...commandItems]) {
      if (trimmed && !filterItem(item, query)) continue
      const group = item.group ?? t('commandPalette.ungrouped')
      const arr = bucket.get(group) ?? []
      arr.push(item)
      bucket.set(group, arr)
    }
    return Array.from(bucket.entries()).map(([label, items]) => ({
      value: label,
      label,
      items,
    }))
  }, [commandItems, filterItem, query, searchItems, t])

  // Ctrl+1..9 快速选择：当前可见条目的扁平序（搜索命中 → 各分组声明序）
  const visibleFlat = useMemo(
    () => paletteGroups.flatMap((group) => group.items),
    [paletteGroups]
  )
  const quickIndexById = useMemo(() => {
    const map = new Map<string, number>()
    visibleFlat.slice(0, QUICK_SELECT_SLOTS).forEach((item, index) => {
      map.set(item.id, index)
    })
    return map
  }, [visibleFlat])
  const quickShortcutFor = useCallback(
    (itemId: string): string | undefined => {
      const index = quickIndexById.get(itemId)
      return index === undefined
        ? undefined
        : formatComboForDisplay(`mod+${index + 1}`).join(" ")
    },
    [quickIndexById]
  )

  // 键盘 Enter 选中：base-ui autocomplete 高亮项经 onItemHighlighted 记录，选择语义自持
  const highlightedRef = useRef<PaletteEntry | null>(null)
  const handleItemHighlighted = useCallback((value: unknown) => {
    highlightedRef.current = (value as PaletteEntry | undefined) ?? null
  }, [])

  // —— 内嵌轻量 AI 问答：走助手会话 send（sync 终文 / runtime 异步回流），无 mock ——
  const enterAiMode = useCallback(() => {
    setAi((prev) => ({ ...AI_IDLE, active: true, input: prev.active ? prev.input : "" }))
  }, [])

  const backToSearch = useCallback(() => {
    aiAbortRef.current?.abort()
    setAi(AI_IDLE)
  }, [])

  const askAi = useCallback(
    async (question: string) => {
      const trimmed = question.trim()
      if (!trimmed) return
      aiAbortRef.current?.abort()
      const controller = new AbortController()
      aiAbortRef.current = controller
      setAi({
        active: true,
        input: "",
        submitted: trimmed,
        response: "",
        channel: null,
        isGenerating: true,
        error: null,
        refs: [],
      })
      // 相关页面引用：真实 /search 命中（失败静默，不阻塞回答）
      searchApi
        .search({ q: trimmed, types: AI_REF_TYPES, limit: AI_REF_LIMIT }, { signal: controller.signal })
        .then((result) => {
          if (controller.signal.aborted) return
          const refs = result.items
            .filter((hit) => Boolean(hit.path))
            .map((hit) => ({ id: hit.id, title: hit.title, path: hit.path }))
          setAi((prev) => (prev.active ? { ...prev, refs } : prev))
        })
        .catch(() => undefined)
      try {
        const result = await assistantApi.send({ content: trimmed })
        if (controller.signal.aborted) return
        setAi((prev) =>
          prev.active
            ? {
                ...prev,
                isGenerating: false,
                channel: result.mode,
                response: result.message?.content ?? "",
              }
            : prev
        )
      } catch {
        if (controller.signal.aborted) return
        setAi((prev) =>
          prev.active
            ? { ...prev, isGenerating: false, error: t('commandPalette.aiError', '生成失败，请重试。') }
            : prev
        )
      }
    },
    [t]
  )

  // AI 模式下 Esc 语义改为「返回搜索」（capture 先于 Dialog 的关闭语义）
  useEffect(() => {
    if (!open || !ai.active) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        backToSearch()
      }
    }
    document.addEventListener("keydown", handleEscape, true)
    return () => document.removeEventListener("keydown", handleEscape, true)
  }, [open, ai.active, backToSearch])

  const handleInputKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      // Tab：直通 AI 问答模式（coss p-command-2 同款入口）
      if (event.key === "Tab") {
        event.preventDefault()
        enterAiMode()
        return
      }
      // Ctrl/Cmd+1..9：快速选择可见条目
      if ((event.ctrlKey || event.metaKey) && /^[1-9]$/.test(event.key)) {
        const target = visibleFlat[Number(event.key) - 1]
        if (target) {
          event.preventDefault()
          handleSelect(target)
        }
        return
      }
      if (event.key === "Enter") {
        const highlighted = highlightedRef.current
        if (highlighted) {
          event.preventDefault()
          handleSelect(highlighted)
          return
        }
        if (query.trim()) {
          // 零命中回车：带词进入 AI 问答并直接提问
          event.preventDefault()
          void askAi(query)
        }
      }
    },
    [askAi, enterAiMode, handleSelect, query, visibleFlat]
  )

  const handleAiInputKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        event.preventDefault()
        backToSearch()
        return
      }
      if (event.key === "Enter" && !ai.isGenerating) {
        event.preventDefault()
        void askAi(ai.input)
      }
    },
    [ai.input, ai.isGenerating, askAi, backToSearch]
  )

  const hasResults = paletteGroups.length > 0
  const trimmedQuery = query.trim()
  const triggerKeys = useMemo(() => {
    const combo = getEffectiveCombo('command-palette') ?? 'mod+k'
    return formatComboForDisplay(combo).join(' ')
  }, [])

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
        onOpenChange={(nextOpen: boolean) => {
          setOpen(nextOpen)
          if (!nextOpen) {
            closePalette()
          }
        }}
      >
        <CommandDialogPopup aria-label={t('commandPalette.title')}>
          {ai.active ? (
            <Command mode="none" items={[]}>
              <div className="relative flex items-center *:first:flex-1 bg-muted/50">
                <CommandInput
                  onChange={(event) =>
                    setAi((prev) => ({ ...prev, input: event.target.value }))
                  }
                  onKeyDown={handleAiInputKeyDown}
                  placeholder={t('commandPalette.aiPlaceholder', '问问 AI…')}
                  value={ai.input}
                  aria-label={t('commandPalette.aiPlaceholder', '问问 AI…')}
                  startAddon={<SparklesIcon />}
                />
                <Button
                  className="me-2.5 rounded-md text-sm not-hover:text-muted-foreground sm:text-xs"
                  onClick={backToSearch}
                  size="sm"
                  variant="ghost"
                >
                  <ArrowLeftIcon className="size-4 sm:size-3.5" />
                  {t('commandPalette.backToSearch', '返回搜索')}
                  <Kbd className="-me-1.5 ms-0.5">Esc</Kbd>
                </Button>
              </div>
              <CommandPanel>
                <ScrollArea className="max-h-80" overscrollContain scrollbarGutter scrollFade>
                  <div className="p-5">
                    {!ai.isGenerating && !ai.response && !ai.error && !ai.submitted ? (
                      <p className="py-6 text-center text-muted-foreground text-sm">
                        {t('commandPalette.aiEmpty', '输入问题，按 Enter 获取回答')}
                      </p>
                    ) : null}
                    {ai.error ? (
                      <div aria-live="polite" className="text-destructive text-sm" role="alert">
                        {ai.error}
                      </div>
                    ) : null}
                    {ai.isGenerating ? (
                      <div className="flex flex-col gap-4" aria-live="polite">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Spinner className="size-3" />
                          <span className="animate-pulse">
                            {t('commandPalette.aiGenerating', '生成中…')}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      </div>
                    ) : null}
                    {ai.response ? (
                      <div
                        aria-live="polite"
                        className="text-foreground text-sm [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded-md [&_code]:bg-muted [&_code]:px-[0.3rem] [&_code]:py-[0.2rem] [&_code]:font-mono [&_p]:not-first:mt-3 [&_p]:leading-relaxed"
                      >
                        <ReactMarkdown>{ai.response}</ReactMarkdown>
                      </div>
                    ) : null}
                    {!ai.isGenerating && !ai.response && ai.channel === 'runtime' ? (
                      <p className="text-muted-foreground text-sm">
                        {t(
                          'commandPalette.aiRuntimeDelegated',
                          '已转交 CLI 同事异步执行，回答将在 AI 助手面板回流。'
                        )}
                      </p>
                    ) : null}
                    {ai.refs.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="w-full text-10 text-muted-foreground">
                          {t('commandPalette.relatedPages', '相关页面')}
                        </span>
                        {ai.refs.map((ref) => (
                          <Button
                            key={ref.id}
                            onClick={() => {
                              navigate(ref.path)
                              closePalette()
                            }}
                            size="sm"
                            variant="secondary"
                          >
                            {ref.title}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </ScrollArea>
              </CommandPanel>
              <CommandFooter>
                {ai.isGenerating ? (
                  <div aria-live="polite" className="flex items-center gap-2">
                    <div className="flex h-5 items-center justify-center">
                      <Spinner className="size-3" />
                    </div>
                    <span className="animate-pulse">
                      {t('commandPalette.aiGenerating', '生成中…')}
                    </span>
                  </div>
                ) : ai.submitted ? (
                  <div className="flex items-center gap-2">
                    <CircleHelpIcon className="size-3" />
                    <span>
                      {t('commandPalette.youAsked', '你问过：')}
                      <span className="font-medium text-foreground">&quot;{ai.submitted}&quot;</span>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Kbd>
                      <CornerDownLeftIcon />
                    </Kbd>
                    <span>{t('commandPalette.aiSendHint', '发送')}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Kbd>ESC</Kbd>
                  <span>{t('commandPalette.backToSearch', '返回搜索')}</span>
                </div>
              </CommandFooter>
            </Command>
          ) : (
            <Command
              items={paletteGroups}
              filter={filterItem}
              onItemHighlighted={handleItemHighlighted}
            >
              <div className="relative flex items-center *:first:flex-1">
                <CommandInput
                  onChange={(event) => handleQueryChange(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder={t('commandPalette.placeholder')}
                  value={query}
                  aria-label={t('commandPalette.title')}
                />
                <Button
                  className="me-2.5 rounded-md text-sm not-hover:text-muted-foreground sm:text-xs"
                  onClick={enterAiMode}
                  size="sm"
                  variant="ghost"
                >
                  <SparklesIcon className="size-4 sm:size-3.5" />
                  {t('commandPalette.askAi', '询问 AI')}
                  <Kbd className="-me-1.5 ms-0.5">Tab</Kbd>
                </Button>
              </div>
              <CommandPanel>
                <CommandEmpty className="not-empty:py-12">
                  {trimmedQuery ? (
                    <div className="wrap-break-word flex flex-col items-center gap-2">
                      <EmptySearchMedia />
                      <p>{t('commandPalette.empty')}</p>
                      <p>
                        {t('commandPalette.askAiAbout', '按 Enter 询问 AI 助手：')}
                        <br />{" "}
                        <strong className="font-medium text-foreground">{trimmedQuery}</strong>
                      </p>
                    </div>
                  ) : (
                    t('commandPalette.empty')
                  )}
                </CommandEmpty>
                {trimmedQuery && searchFetching ? (
                  <div
                    className="px-3 py-2 text-xs text-muted-foreground"
                    data-testid="palette-entity-searching"
                  >
                    {t('commandPalette.searching', '搜索中…')}
                  </div>
                ) : null}
                {!searchFetching && searchItems.length === 0 ? (
                  // 空态提示：说明面板除命令外还支持搜工单/项目
                  <div
                    className="px-3 py-2 text-xs text-muted-foreground"
                    data-testid="palette-entity-search-hint"
                  >
                    {t('commandPalette.searchHint', '输入以搜索工单/项目')}
                  </div>
                ) : null}
                <CommandList scrollAreaClassName="max-h-72">
                  {(group: PaletteGroup) => (
                    <CommandGroup items={group.items} key={group.value}>
                      <CommandGroupLabel>{group.label}</CommandGroupLabel>
                      <CommandCollection>
                        {(item: PaletteEntry) => {
                          const Icon = item.icon
                          const quickShortcut = quickShortcutFor(item.id)
                          return (
                            <CommandItem
                              key={item.id}
                              onClick={() => handleSelect(item)}
                              value={item}
                            >
                              {Icon ? (
                                <Icon
                                  className={
                                    item.iconColor
                                      ? "size-4 shrink-0"
                                      : `size-4 shrink-0 ${item.iconToneClass ?? "text-muted-foreground"}`
                                  }
                                  style={
                                    item.iconColor ? { color: item.iconColor } : undefined
                                  }
                                />
                              ) : null}
                              <span className="min-w-0 flex-1 truncate">{item.label}</span>
                              {item.shortcut || quickShortcut ? (
                                <CommandShortcut>{item.shortcut ?? quickShortcut}</CommandShortcut>
                              ) : null}
                            </CommandItem>
                          )
                        }}
                      </CommandCollection>
                    </CommandGroup>
                  )}
                </CommandList>
              </CommandPanel>
              <CommandFooter>
                {hasResults ? (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <KbdGroup>
                        <Kbd>
                          <ArrowUpIcon />
                        </Kbd>
                        <Kbd>
                          <ArrowDownIcon />
                        </Kbd>
                      </KbdGroup>
                      <span>{t('commandPalette.hintNavigate')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Kbd>
                        <CornerDownLeftIcon />
                      </Kbd>
                      <span>{t('commandPalette.hintSelect')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Kbd>ESC</Kbd>
                      <span>{t('commandPalette.hintClose')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Kbd>ESC</Kbd>
                    <span>{t('commandPalette.hintClose')}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <CircleHelpIcon className="size-3" />
                  <Kbd>{triggerKeys}</Kbd>
                </div>
              </CommandFooter>
            </Command>
          )}
        </CommandDialogPopup>
      </CommandDialog>
    </CommandPaletteContext.Provider>
  )
}

/** 空态图标（coss p-command-2 EmptyMedia 同款观感，未引 empty-state 套件保持面板轻量） */
function EmptySearchMedia() {
  return (
    <div
      aria-hidden="true"
      className="flex size-12 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground [&_svg]:size-5"
    >
      <SearchIcon />
    </div>
  )
}

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext)
  if (!context) {
    throw new Error("useCommandPalette must be used within CommandPaletteProvider")
  }
  return context
}
