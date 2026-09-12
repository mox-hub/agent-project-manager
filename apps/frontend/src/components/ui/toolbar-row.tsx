import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  Bot,
  Bug,
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Filter,
  Flag,
  FolderOpen,
  Inbox,
  Kanban,
  LayoutGrid,
  List,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Star,
  TableProperties,
  Tag,
  Target,
  User,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HeaderActionButton } from "./header-action-button";
import { AnchoredMenu } from "./anchored-menu";
import { Checkbox } from "./checkbox";
import { SegmentedControl, type SegmentedTone } from "./segmented-control";
import { Input } from "./input";
import {
  MENU_ITEM_CLASS,
  MENU_LABEL_CLASS,
  MENU_SEPARATOR_CLASS,
} from "./menu-surface";
import { ContextMenu, type MenuItem } from "./context-menu";
import {
  ViewDisplayPopover,
  type ViewDisplayPopoverProps,
} from "./view-display-popover";

/* ────────────────────────────── 类型 ────────────────────────────── */

/** 已保存视图：名称 + 图标 + 页面状态快照（筛选/样式/排序等，结构由页面自定义，天然可扩展） */
export interface ToolbarViewEntry {
  id: string;
  name: string;
  /** 图标 key，经 TOOLBAR_VIEW_ICONS 解析 */
  icon?: string;
  /** 内置视图不可删除 */
  builtIn?: boolean;
  snapshot?: Record<string, unknown>;
}

export interface ToolbarViewStyleOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  /** 激活滑块高亮色调（页面按需传入） */
  tone?: SegmentedTone;
}

export interface ToolbarMenuItem {
  type?: "item" | "label" | "separator" | "checkbox";
  id?: string;
  label?: ReactNode;
  icon?: LucideIcon;
  checked?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

export interface ToolbarMenuSlot {
  /** 完全自定义按钮+弹层节点（如二级级联筛选菜单 FilterCascadeMenu），提供时优先于 content/items */
  render?: () => ReactNode;
  /** 高级显示弹窗配置（直接渲染 Linear 风格 ViewDisplayPopover） */
  displayConfig?: ViewDisplayPopoverProps;
  /** 结构化菜单项 */
  items?: ToolbarMenuItem[];
  /** 完全自定义下拉内容（优先于 items） */
  content?: ReactNode;
  /** 筛选菜单顶部搜索框（内置 300ms 防抖） */
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  /** 按钮右上角数字角标（>0 显示，如生效中的筛选数量） */
  badge?: number;
}

/* ─────────────────── Filter 多选状态工具 ─────────────────── */

/**
 * 快照里的筛选项归一为数组：兼容历史单值（string / 'all'）与新多值（string[]）。
 * 空数组 = 该维度不做筛选（等价于旧 'all'）。
 */
export function normalizeFilterSelection(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && v !== "all");
  }
  return typeof value === "string" && value !== "all" ? [value] : [];
}

/** 勾选/取消勾选一个筛选项（不可变更新） */
export function toggleFilterValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

export interface ToolbarActionDescriptor {
  id: string;
  icon: LucideIcon;
  label: string;
  variant?: "primary" | "outline" | "secondary" | "ghost" | "danger";
  /** 无下拉的直接动作按钮（圆形 hover 展开） */
  onClick?: () => void;
  /** 带下拉的按钮 */
  menu?: ToolbarMenuSlot;
  /** 自定义节点（如进度按钮等无法用 icon/label 描述的动作件），提供时优先于其余字段 */
  render?: () => ReactNode;
}

export interface ToolbarRowProps {
  aiId?: string;
  className?: string;
  /* 视图管理（左） */
  views: ToolbarViewEntry[];
  activeViewId: string;
  onSelectView: (id: string) => void;
  onCreateView: (name: string, icon?: string) => void;
  onUpdateView: (id: string, patch: Partial<Pick<ToolbarViewEntry, "name" | "icon">>) => void;
  onDeleteView: (id: string) => void;
  /** 当前视图是否有未保存变动（指示脏状态） */
  isDirty?: boolean;
  /** 保存当前改动到当前激活视图 */
  onSaveCurrentView?: () => void;
  /* 视图样式切换（居中 / 右侧下拉） */
  viewStyle?: {
    value: string;
    onChange: (value: string) => void;
    options: ToolbarViewStyleOption[];
    /** auto：样式 >3 种时收进右侧按钮组下拉（默认），否则居中 */
    layout?: "auto" | "centered" | "dropdown";
  };
  /* 右侧按钮组：默认 筛选 / 显示 / 下载，传 false 移除 */
  filterMenu?: ToolbarMenuSlot | false;
  displayMenu?: ToolbarMenuSlot | false;
  downloadMenu?: ToolbarMenuSlot | false;
  /** 页面注册的附加按钮（追加在默认按钮之后） */
  extraActions?: ToolbarActionDescriptor[];
  /** 自定义动作/状态节点（渲染在右侧按钮组前） */
  actions?: ReactNode;
}

/** 视图可选图标（存储为字符串 key） */
export const TOOLBAR_VIEW_ICONS: Record<string, LucideIcon> = {
  list: List,
  board: Kanban,
  gantt: CalendarRange,
  table: TableProperties,
  grid: LayoutGrid,
  bot: Bot,
  star: Star,
  flag: Flag,
  inbox: Inbox,
  tag: Tag,
  target: Target,
  zap: Zap,
  bug: Bug,
  folder: FolderOpen,
  clock: Clock,
  user: User,
  check: CheckCircle2,
  sparkles: Sparkles,
};

/* ─────────────────────────── useToolbarViews ─────────────────────────── */

interface UseToolbarViewsOptions {
  /** localStorage key 后缀：toolbar-views:<key> */
  key: string;
  /** 默认视图（至少一个），本地无存储时兜底 */
  defaults: ToolbarViewEntry[];
  /** 切换视图时恢复快照到页面状态 */
  onApply?: (snapshot: Record<string, unknown> | undefined) => void;
}

const storageKeyOf = (key: string) => `toolbar-views:${key}`;

function loadViews(key: string, defaults: ToolbarViewEntry[]): ToolbarViewEntry[] {
  try {
    const raw = localStorage.getItem(storageKeyOf(key));
    if (!raw) return defaults;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return defaults;
    return parsed as ToolbarViewEntry[];
  } catch {
    return defaults;
  }
}

/**
 * 已保存视图状态管理：持久化到 localStorage（每页独立 key）。
 */
export function useToolbarViews({ key, defaults, onApply }: UseToolbarViewsOptions) {
  const [initialState] = useState(() => {
    const loaded = loadViews(key, defaults);
    return { views: loaded, activeViewId: loaded[0]?.id ?? "" };
  });
  const [views, setViews] = useState<ToolbarViewEntry[]>(initialState.views);
  const [activeViewId, setActiveViewId] = useState<string>(initialState.activeViewId);
  const [isDirty, setIsDirty] = useState(false);

  const onApplyRef = useRef(onApply);
  const viewsRef = useRef(views);
  const activeIdRef = useRef(activeViewId);
  const snapshotRef = useRef<Record<string, unknown> | undefined>(initialState.views[0]?.snapshot);

  const [loadedKey, setLoadedKey] = useState(key);
  if (loadedKey !== key) {
    setLoadedKey(key);
    const reloaded = loadViews(key, defaults);
    setViews(reloaded);
    setActiveViewId(reloaded[0]?.id ?? "");
    setIsDirty(false);
  }

  useEffect(() => {
    onApplyRef.current = onApply;
    viewsRef.current = views;
    activeIdRef.current = activeViewId;
    const activeSnapshot = views.find((v) => v.id === activeViewId)?.snapshot;
    if (activeSnapshot !== undefined) snapshotRef.current = activeSnapshot;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKeyOf(key), JSON.stringify(views));
    } catch {
      /* 存储不可用时静默降级为内存态 */
    }
  }, [key, views]);

  const selectView = useCallback((id: string) => {
    const target = viewsRef.current.find((v) => v.id === id);
    if (!target || id === activeIdRef.current) return;
    snapshotRef.current = target.snapshot;
    setActiveViewId(id);
    setIsDirty(false);
    onApplyRef.current?.(target.snapshot);
  }, []);

  /** 页面状态变化时上报，写入当前激活视图的快照 */
  const updateActiveSnapshot = useCallback((snapshot: Record<string, unknown>) => {
    snapshotRef.current = snapshot;
    setViews((prev) => {
      let changed = false;
      const next = prev.map((v) => {
        if (v.id !== activeIdRef.current) return v;
        if (JSON.stringify(v.snapshot) === JSON.stringify(snapshot)) return v;
        changed = true;
        return { ...v, snapshot };
      });
      return changed ? next : prev;
    });
  }, []);

  /** 以当前页面状态为快照新建视图并激活 */
  const createView = useCallback((name: string, icon?: string) => {
    const id = `view-${Date.now().toString(36)}`;
    const snapshot = snapshotRef.current ?? {};
    setViews((prev) => [...prev, { id, name: name.trim() || "View", icon: icon ?? "star", snapshot }]);
    setActiveViewId(id);
    setIsDirty(false);
  }, []);

  const updateView = useCallback(
    (id: string, patch: Partial<Pick<ToolbarViewEntry, "name" | "icon">>) => {
      setViews((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
    },
    [],
  );

  const deleteView = useCallback((id: string) => {
    const current = viewsRef.current;
    const target = current.find((v) => v.id === id);
    if (!target || target.builtIn || current.length <= 1) return;
    const next = current.filter((v) => v.id !== id);
    setViews(next);
    if (id === activeIdRef.current) {
      const fallback = next[0];
      snapshotRef.current = fallback.snapshot;
      setActiveViewId(fallback.id);
      setIsDirty(false);
      onApplyRef.current?.(fallback.snapshot);
    }
  }, []);

  const saveCurrentToActive = useCallback(() => {
    if (snapshotRef.current) {
      updateActiveSnapshot(snapshotRef.current);
      setIsDirty(false);
    }
  }, [updateActiveSnapshot]);

  return {
    views,
    activeViewId,
    selectView,
    updateActiveSnapshot,
    createView,
    updateView,
    deleteView,
    isDirty,
    saveCurrentToActive,
  };
}

/* ─────────────────────────── 内部子组件 ─────────────────────────── */

function ToolbarSearchBox({
  value,
  onChange,
  placeholder,
}: NonNullable<ToolbarMenuSlot["search"]>) {
  const [buffer, setBuffer] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  if (prevValue !== value) {
    setPrevValue(value);
    setBuffer(value);
  }

  useEffect(() => {
    clearTimeout(timer.current);
  }, [value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleChange = (next: string) => {
    setBuffer(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next), 300);
  };

  return (
    <Input
      value={buffer}
      onChange={(event) => handleChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          clearTimeout(timer.current);
          onChange(buffer);
        }
      }}
      placeholder={placeholder}
      className="h-8 text-xs"
    />
  );
}

function ToolbarMenuItems({ items, close }: { items: ToolbarMenuItem[]; close: () => void }) {
  return (
    <div className="min-w-40">
      {items.map((item, index) => {
        const key = item.id ?? index;
        if (item.type === "separator") {
          return <div key={key} className={MENU_SEPARATOR_CLASS} />;
        }
        if (item.type === "label") {
          return (
            <div key={key} className={MENU_LABEL_CLASS}>
              {item.label}
            </div>
          );
        }
        const Icon = item.icon;
        const isCheckbox = item.type === "checkbox";
        return (
          <button
            key={key}
            type="button"
            disabled={item.disabled}
            onClick={() => {
              item.onSelect?.();
              if (!isCheckbox) close();
            }}
            className={cn(
              MENU_ITEM_CLASS,
              "text-xs",
              item.disabled && "pointer-events-none opacity-50",
            )}
          >
            {isCheckbox ? (
              <Checkbox
                className="mr-2"
                checked={item.checked ?? false}
                render={<span aria-hidden="true" />}
              />
            ) : Icon ? (
              <Icon className="mr-2 size-4 shrink-0" strokeWidth={1.75} />
            ) : null}
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ToolbarMenuButton({
  icon,
  label,
  variant = "outline",
  menu,
  ...buttonProps
}: {
  icon: LucideIcon;
  label: string;
  variant?: ToolbarActionDescriptor["variant"];
  menu: ToolbarMenuSlot;
} & Omit<ComponentProps<typeof HeaderActionButton>, "icon" | "label" | "variant">) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  return (
    <span className="relative inline-flex shrink-0">
      <HeaderActionButton
        ref={anchorRef}
        icon={icon}
        label={label}
        variant={variant}
        pinned={open}
        trailing={<ChevronDown className="ml-0.5 size-3 opacity-70" />}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        {...buttonProps}
      />
      {menu.badge && menu.badge > 0 ? (
        <span className="pointer-events-none absolute -top-1 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-xs font-medium leading-none text-white">
          {menu.badge > 99 ? "99+" : menu.badge}
        </span>
      ) : null}
      <AnchoredMenu open={open} onClose={close} anchor={anchorRef}>
        {menu.displayConfig ? (
          <ViewDisplayPopover {...menu.displayConfig} />
        ) : (
          menu.content ?? (
            <div className="flex max-h-80 flex-col">
              {menu.search ? (
                <div className="mb-1 shrink-0">
                  <ToolbarSearchBox {...menu.search} />
                </div>
              ) : null}
              <div className="min-h-0 overflow-y-auto">
                <ToolbarMenuItems items={menu.items ?? []} close={close} />
              </div>
            </div>
          )
        )}
      </AnchoredMenu>
    </span>
  );
}

function ExtraActionButton({ action }: { action: ToolbarActionDescriptor }) {
  if (action.render) {
    return <>{action.render()}</>;
  }
  if (action.menu) {
    return (
      <ToolbarMenuButton
        icon={action.icon}
        label={action.label}
        variant={action.variant}
        menu={action.menu}
        data-ai-component={action.id}
      />
    );
  }
  return (
    <HeaderActionButton
      icon={action.icon}
      label={action.label}
      variant={action.variant}
      onClick={action.onClick}
      data-ai-component={action.id}
    />
  );
}

const PRESET_VIEW_NAMES = [
  { label: "全部工单", icon: "list" },
  { label: "我的待办", icon: "star" },
  { label: "按状态看板", icon: "board" },
  { label: "时间线排期", icon: "gantt" },
  { label: "高优缺陷", icon: "bug" },
  { label: "AI 自动化", icon: "bot" },
];

/** 视图新建/编辑面板（AnchoredMenu 内容） */
function ViewEditorPanel({
  initialName = "",
  initialIcon,
  builtIn,
  submitText,
  onSubmit,
  onDelete,
}: {
  initialName?: string;
  initialIcon?: string;
  builtIn?: boolean;
  submitText: string;
  onSubmit: (name: string, icon: string) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState(initialIcon ?? "star");

  return (
    <form
      className="flex w-72 flex-col gap-2.5 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(name.trim() || "View", icon);
      }}
    >
      <div className="text-xs font-semibold text-foreground">
        {builtIn ? "编辑视图" : submitText === "Create" ? "新建自定义视图" : "编辑视图"}
      </div>

      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="输入视图名称..."
        className="h-8 text-xs"
        autoFocus
      />

      {submitText === "Create" ? (
        <div className="flex flex-wrap gap-1">
          {PRESET_VIEW_NAMES.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setName(preset.label);
                setIcon(preset.icon);
              }}
              className="rounded border border-border bg-muted/30 px-1.5 py-0.5 text-11 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {preset.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="text-11 text-muted-foreground">选择代表图标</div>
      <div className="grid grid-cols-6 gap-1.5 max-h-36 overflow-y-auto pr-1">
        {Object.entries(TOOLBAR_VIEW_ICONS).map(([key, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setIcon(key)}
            aria-label={key}
            className={cn(
              "flex size-8 items-center justify-center rounded-md border transition-colors",
              icon === key
                ? "border-primary bg-primary/10 text-primary shadow-2xs"
                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" strokeWidth={1.75} />
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          className="inline-flex h-8 flex-1 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
        >
          {submitText}
        </button>
        {onDelete && !builtIn ? (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-8 items-center justify-center rounded-md border border-border px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            删除
          </button>
        ) : null}
      </div>
    </form>
  );
}

/** 胶囊风格 ViewPill：rounded-full 胶囊、取消三个点、右键呼出系统 ContextMenu */
function ViewPill({
  view,
  active,
  isDirty,
  onSelect,
  onUpdate,
  onDelete,
  onSaveCurrent,
}: {
  view: ToolbarViewEntry;
  active: boolean;
  isDirty?: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Pick<ToolbarViewEntry, "name" | "icon">>) => void;
  onDelete: (id: string) => void;
  onSaveCurrent?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const Icon = view.icon ? TOOLBAR_VIEW_ICONS[view.icon] : undefined;

  const contextMenuItems: MenuItem[] = [
    ...(active && isDirty && onSaveCurrent
      ? [
          {
            id: "save",
            label: "保存当前改动到视图",
            onClick: () => onSaveCurrent(),
          },
        ]
      : []),
    {
      id: "edit",
      label: "编辑名称与图标",
      onClick: () => setEditing(true),
    },
    ...(!view.builtIn
      ? [
          {
            id: "delete",
            label: "删除视图",
            destructive: true,
            onClick: () => onDelete(view.id),
          },
        ]
      : []),
  ];

  return (
    <div className="relative inline-flex shrink-0">
      <ContextMenu items={contextMenuItems}>
        <button
          ref={anchorRef}
          type="button"
          onClick={() => onSelect(view.id)}
          title={`${view.name} (右键管理)`}
          aria-label={view.name}
          className={cn(
            "flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all select-none [transition-duration:var(--motion-fast)]",
            active
              ? "border-border bg-card text-foreground shadow-2xs font-semibold"
              : "border-border/40 bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          {Icon ? <Icon className="size-3.5 shrink-0 opacity-80" strokeWidth={1.75} /> : null}
          <span className="max-w-32 truncate">{view.name}</span>
          {active && isDirty ? (
            <span
              title="包含未保存的筛选或显示改动"
              className="size-1.5 rounded-full bg-accent-yellow ring-1 ring-accent-yellow/40"
            />
          ) : null}
        </button>
      </ContextMenu>

      <AnchoredMenu open={editing} onClose={() => setEditing(false)} anchor={anchorRef}>
        <ViewEditorPanel
          initialName={view.name}
          initialIcon={view.icon}
          builtIn={view.builtIn}
          submitText="保存"
          onSubmit={(name, icon) => {
            onUpdate(view.id, { name, icon });
            setEditing(false);
          }}
          onDelete={() => {
            onDelete(view.id);
            setEditing(false);
          }}
        />
      </AnchoredMenu>
    </div>
  );
}

/** 胶囊风格新增视图按钮：rounded-full 微虚线 */
function AddViewButton({ onCreate }: { onCreate: (name: string, icon?: string) => void }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add view"
        title="Add view"
        className="flex h-7 shrink-0 items-center justify-center rounded-full border border-dashed border-border/70 px-2 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
      >
        <Plus className="size-3.5" strokeWidth={2} aria-hidden />
      </button>
      <AnchoredMenu open={open} onClose={() => setOpen(false)} anchor={anchorRef}>
        <ViewEditorPanel
          submitText="Create"
          onSubmit={(name, icon) => {
            onCreate(name, icon);
            setOpen(false);
          }}
        />
      </AnchoredMenu>
    </>
  );
}

function ViewStyleDropdown({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ToolbarViewStyleOption[];
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const current = options.find((option) => option.value === value) ?? options[0];
  if (!current) return null;

  return (
    <>
      <HeaderActionButton
        ref={anchorRef}
        icon={current.icon ?? LayoutGrid}
        label={current.label}
        variant="outline"
        pinned
        trailing={<ChevronDown className="ml-0.5 size-3 opacity-70" />}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      />
      <AnchoredMenu open={open} onClose={() => setOpen(false)} anchor={anchorRef}>
        <div className="min-w-36">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(MENU_ITEM_CLASS, "text-xs")}
              >
                {Icon ? <Icon className="mr-2 size-4 shrink-0" strokeWidth={1.75} /> : null}
                <span className="flex-1 truncate">{option.label}</span>
                {option.value === current.value ? (
                  <Check className="ml-2 size-3.5 shrink-0 text-primary" strokeWidth={2.5} />
                ) : null}
              </button>
            );
          })}
        </div>
      </AnchoredMenu>
    </>
  );
}

/* ─────────────────────────── ToolbarRow ─────────────────────────── */

export function ToolbarRow({
  aiId,
  className,
  views,
  activeViewId,
  onSelectView,
  onCreateView,
  onUpdateView,
  onDeleteView,
  isDirty,
  onSaveCurrentView,
  viewStyle,
  filterMenu,
  displayMenu,
  downloadMenu,
  extraActions,
  actions,
}: ToolbarRowProps) {
  // 当 layout 为 centered 时优先居中；若未显式指定，当选项 > 3 种时自动下拉收纳（兼容历史规则）
  const styleLayout =
    viewStyle?.layout === "centered" || viewStyle?.layout === "dropdown"
      ? viewStyle.layout
      : viewStyle && viewStyle.options.length > 3
        ? "dropdown"
        : "centered";

  return (
    <header
      className={cn(
        "sticky top-10 z-10 grid w-full shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-border bg-background px-6 py-2 md:px-7",
        className,
      )}
      data-ai-component={aiId ? `${aiId}.context-bar` : "ui.toolbar-row"}
      data-ai-role="filter"
    >
      <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
        {views.map((view) => (
          <ViewPill
            key={view.id}
            view={view}
            active={view.id === activeViewId}
            isDirty={view.id === activeViewId ? isDirty : false}
            onSelect={onSelectView}
            onUpdate={onUpdateView}
            onDelete={onDeleteView}
            onSaveCurrent={onSaveCurrentView}
          />
        ))}
        <AddViewButton onCreate={onCreateView} />
      </div>

      {viewStyle && styleLayout === "centered" ? (
        <div className="justify-self-center">
          <SegmentedControl
            variant="rect"
            value={viewStyle.value}
            onChange={viewStyle.onChange}
            options={viewStyle.options.map((option) => {
              const Icon = option.icon;
              return {
                value: option.value,
                label: option.label,
                icon: Icon ? <Icon className="size-3.5" strokeWidth={1.75} /> : undefined,
                tone: option.tone,
              };
            })}
          />
        </div>
      ) : (
        <div />
      )}

      <div className="flex items-center justify-end gap-2">
        {actions}
        {viewStyle && styleLayout === "dropdown" ? (
          <ViewStyleDropdown value={viewStyle.value} onChange={viewStyle.onChange} options={viewStyle.options} />
        ) : null}
        {filterMenu ? (
          filterMenu.render ? (
            filterMenu.render()
          ) : (
            <ToolbarMenuButton icon={Filter} label="Filter" menu={filterMenu} />
          )
        ) : null}
        {displayMenu ? (
          displayMenu.render ? (
            displayMenu.render()
          ) : (
            <ToolbarMenuButton icon={SlidersHorizontal} label="Display" menu={displayMenu} />
          )
        ) : null}
        {downloadMenu ? (
          <ToolbarMenuButton icon={Download} label="Download" menu={downloadMenu} />
        ) : null}
        {extraActions?.map((action) => (
          <ExtraActionButton key={action.id} action={action} />
        ))}
      </div>
    </header>
  );
}
