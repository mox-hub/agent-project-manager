/**
 * DataList - 自建通用列表组件
 *
 * 以任务列表「Task Rows」为基准抽出的通用、可复用列表，支持：
 * 1) 两种模式
 *    - no grouping（默认）：行内最左侧为多选框（默认留空、hover 显示、选中常显），
 *      其右侧为首要信息区（renderLeading，页面注册），行最右侧为次要信息区（renderTrailing）。
 *    - grouping：通过 `groupBy` 启用，插入 grouping bar（手风琴），对全量数据分组展示。
 * 2) grouping bar：长条状圆角矩形；最左展开图标 → 自定义图标+文本 → 数量 →（可选）进度条 → 最右添加按钮；
 *    所有分组可点击展开/收缩，分组之间保留小间距。
 * 3) 多选时页面正下方出现悬浮胶囊：最左已选数量 → 快捷操作按钮组（自定义）→ 最右无背景固定关闭按钮。
 *
 * 所有信息均为页面传入的内嵌节点，另附几个常见格式的单元格组件：ListText / ListChip / ListDate / ListIcon / ListAvatar。
 */

import { isValidElement, memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  User as UserIcon,
  Circle as CircleIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContextMenu, type MenuItem } from '@/components/ui/context-menu';
import { EmptyState } from '@/components/semantic/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { MemberAvatar } from '@/modules/team-member/components/member-avatar';

// ============================================================================
// Types
// ============================================================================

export interface DataListItem {
  id: string;
}

export interface DataListGroupMeta {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  order?: number;
}

export interface DataListProgress {
  done: number;
  total: number;
}

/** 行高两档（F 类 F7.2 / 宪法 §4.2）：同一列表只选一档 */
export type DataListSize = 'dense' | 'comfortable';

// ============================================================================
// 渲染性能阀门（宪法 §21，CAP-B-10）：渲染窗口 / 渲染期开销 / 数据窗口
// ============================================================================

/** §21.1 渐进挂载：单清单首屏行数上限（超过才启用分批补挂） */
const PROGRESSIVE_MOUNT_THRESHOLD = 120;
/** §21.1 渐进挂载：每帧补挂行数 */
const PROGRESSIVE_MOUNT_CHUNK = 60;
/** §21.4 数据窗口 Dev 告警阈值：超过提示接筛选/分组/分页，禁止静默截断数据 */
const DEV_ROW_BUDGET_WARN = 300;
/** 渐进挂载未挂区的占位行高（F7.2 行高两档；占位只撑滚动条，允许近似） */
const ROW_PLACEHOLDER_HEIGHT: Record<DataListSize, number> = { dense: 32, comfortable: 40 };
/** 测试环境短路渐进挂载：jsdom 无真实帧调度，行为级用例判定全量渲染（GAP-T-55） */
const IS_TEST_ENV =
  typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

export interface DataListProps<T extends DataListItem> {
  items: T[];
  loading?: boolean;
  /** 行高两档（F7.2）：dense 32px（默认）/ comfortable 40px（高触达场景：成员列表、设置列表） */
  size?: DataListSize;
  /** 空态文案（默认 i18n「暂无数据」）；渲染走 EmptyState 规范形态 */
  emptyMessage?: ReactNode;
  /** 空态描述行（EmptyState description） */
  emptyDescription?: ReactNode;
  /** 空态图标（EmptyState muted 圆块形态） */
  emptyIcon?: React.ComponentType<{ className?: string }>;
  className?: string;
  /** 总条数基数（默认使用 items.length） */
  totalCount?: number;

  // ---- 行内容（页面注册） ----
  /** 多选框右侧首要信息区 */
  renderLeading?: (item: T) => ReactNode;
  /** 行最右侧次要信息区 */
  renderTrailing?: (item: T) => ReactNode;
  /** 可选子行 */
  renderChildren?: (item: T) => T[];
  onItemClick?: (item: T) => void;
  /** 行右键菜单：返回该行要展示的菜单项（统一右键菜单入口，所有列表页复用） */
  onItemContextMenu?: (item: T) => MenuItem[] | undefined;

  // ---- Grouping（提供 groupBy 即启用分组模式） ----
  groupBy?: (item: T) => string;
  /** 分组展示元数据（标签/图标/排序） */
  groupLabel?: (key: string, items: T[]) => Partial<DataListGroupMeta>;
  /** 可选：分组内完成情况（页面提供条件），返回 null 则不显示进度条 */
  renderGroupProgress?: (items: T[]) => DataListProgress | null;
  /** 分组内添加入口 */
  onGroupCreate?: (key: string, items: T[]) => void;

  // ---- 多选 ----
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  /** 悬浮胶囊内的快捷操作按钮组（传入已选项与关闭回调） */
  selectionActions?: (selected: T[], close: () => void) => ReactNode;
}

// ============================================================================
// 单元格小组件（常见格式）
// ============================================================================

export function ListText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('truncate text-sm', className)}>{children}</span>;
}

export function ListChip({
  children,
  color,
  className,
}: {
  children: ReactNode;
  color?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium',
        className,
      )}
      style={color ? { backgroundColor: `${color}22`, color } : undefined}
    >
      {children}
    </span>
  );
}

export function ListDate({
  value,
  overdue,
  className,
}: {
  value?: string | null;
  overdue?: boolean;
  className?: string;
}) {
  if (!value) return null;
  const d = new Date(value);
  const label = isNaN(d.getTime()) ? value : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <span
      className={cn(
        'whitespace-nowrap text-xs',
        overdue ? 'text-accent-red' : 'text-muted-foreground',
        className,
      )}
    >
      {label}
    </span>
  );
}

export function ListIcon({
  icon: Icon,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return <Icon className={cn('size-4 shrink-0', className)} />;
}

export function ListAvatar({
  name,
  url,
  color: _color,
}: {
  name?: string;
  url?: string | null;
  color?: string;
}) {
  return (
    <MemberAvatar
      name={name}
      avatarUrl={url}
      size="sm"
      showBadge={false}
      className="size-6"
    />
  );
}

/**
 * ListActionButton - 多选悬浮胶囊内的快捷操作按钮
 * 默认带边框的胶囊形按钮（供多选快捷操作按钮组使用）。
 */
export function ListActionButton({
  onClick,
  disabled,
  title,
  className,
  children,
  type = 'button',
}: {
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
  children: ReactNode;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex h-8 shrink-0 items-center gap-1 rounded-full border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
    >
      {children}
    </button>
  );
}

// ============================================================================
// 内部：多选框
// ============================================================================
function SelectCell({
  selected,
  onToggle,
  hidden,
}: {
  selected: boolean;
  onToggle: () => void;
  hidden: boolean;
}) {
  if (hidden) return <div className="w-7 shrink-0" />;
  return (
    // 判定区 = 整个槽位（w-7 × 行高），16px 视觉框居中：槽内任意点都切换选中且不冒泡进行点击
    <div className="flex w-7 shrink-0 self-stretch items-center justify-center">
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="flex h-full w-full items-center justify-center outline-hidden"
      >
        <span
          className={cn(
            'flex size-4 items-center justify-center rounded-sm border transition-all',
            selected
              ? 'border-primary bg-primary text-primary-foreground opacity-100'
              : 'border-muted-foreground/40 text-transparent opacity-0 group-hover:opacity-100',
          )}
        >
          <Check className="size-3" strokeWidth={3} />
        </span>
      </button>
    </div>
  );
}

// ============================================================================
// 内部：单行
// ============================================================================

interface RowProps<T extends DataListItem> {
  item: T;
  size?: DataListSize;
  selectable: boolean;
  /** 多选集合按引用下发（stable identity），行内自查选中态——避免逐行传闭包打穿 memo */
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  renderLeading?: (item: T) => ReactNode;
  renderTrailing?: (item: T) => ReactNode;
  renderChildren?: (item: T) => T[];
  onItemClick?: (item: T) => void;
  onItemContextMenu?: (item: T) => MenuItem[] | undefined;
  indent?: boolean;
  /** 子行链中的最后一行：树线竖线止于行中点（└ 形），非末行贯穿全行（├ 形） */
  isLastChild?: boolean;
  /** 键盘行光标（宪法 §8.2）：bg-accent 与 selected 同 token */
  isActive?: boolean;
}

function RowImpl<T extends DataListItem>({
  item,
  size = 'dense',
  selectable,
  selectedIds,
  onToggleSelect,
  renderLeading,
  renderTrailing,
  renderChildren,
  onItemClick,
  onItemContextMenu,
  indent,
  /** 子行链中的最后一行：树线竖线止于行中点（└ 形），非末行贯穿全行（├ 形） */
  isLastChild,
  isActive,
}: RowProps<T>) {
  const children = renderChildren?.(item) ?? [];
  const rowContent = (
    <div
      data-row-id={item.id}
      className={cn(
        'group relative flex items-center gap-2.5 px-4 transition-colors',
        size === 'comfortable' ? 'py-2.5' : 'py-2',
        // §8.1 三态 token 固定：hover = bg-accent 全档（禁稀释档）；可点击性由 cursor 表达
        onItemClick ? 'cursor-pointer hover:bg-accent' : 'hover:bg-accent',
        isActive && 'bg-accent',
        // §21.1 渲染窗口：离屏行免布局/绘制（DOM 保留，Ctrl+F/锚点不丢）；
        // contain-intrinsic-size 按 F7.2 行高档位给占位尺寸，滚动条不漂移
        '[content-visibility:auto]',
        size === 'comfortable' ? '[contain-intrinsic-size:auto_40px]' : '[contain-intrinsic-size:auto_32px]',
      )}
      onClick={onItemClick ? () => onItemClick(item) : undefined}
    >
      <SelectCell
        hidden={!selectable}
        selected={selectedIds.has(item.id)}
        onToggle={() => onToggleSelect(item.id)}
      />
      {indent ? (
        <>
          {/* 树线：仅竖线，对齐父行状态列中心垂下（left 64 = px-4 16 + 多选槽 28 + gap 10 + 状态半宽 11 - 线半宽 1，行内列宽改动须同步）；
              子行轻缩进 w-4.5（18px，占位居中恰含树线），树线位于子行状态图标左侧不穿图标；
              挂行级 absolute 贯穿含 py 整行保证相邻子行连续，末行止于行中收尾 */}
          <span
            aria-hidden
            className={cn('absolute top-0 left-[64px] w-0.5 bg-border', isLastChild ? 'h-1/2' : 'bottom-0')}
          />
          <span aria-hidden className="w-4.5 shrink-0 self-stretch" />
        </>
      ) : null}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {renderLeading ? renderLeading(item) : null}
      </div>
      {renderTrailing ? (
        <div className="flex shrink-0 items-center gap-2">{renderTrailing(item)}</div>
      ) : null}
    </div>
  );

  // §21.3 渲染期开销：菜单数组走 getItems 惰性口，右键打开的事件期才构建（禁止 render 期逐行重建）
  return (
    <>
      {onItemContextMenu ? (
        <ContextMenu getItems={() => onItemContextMenu(item) ?? []}>
          {rowContent}
        </ContextMenu>
      ) : (
        rowContent
      )}
      {children.map((child, index) => (
        <Row
          key={child.id}
          item={child}
          size={size}
          selectable={selectable}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
          renderLeading={renderLeading}
          renderTrailing={renderTrailing}
          renderChildren={renderChildren}
          onItemClick={onItemClick}
          onItemContextMenu={onItemContextMenu}
          indent
          isLastChild={index === children.length - 1}
        />
      ))}
    </>
  );
}

const Row = memo(RowImpl) as typeof RowImpl;

// ============================================================================
// 内部：grouping bar
// ============================================================================

function GroupBar({
  meta,
  count,
  expanded,
  onToggle,
  progress,
  onAdd,
}: {
  meta: DataListGroupMeta;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  progress?: DataListProgress | null;
  onAdd?: () => void;
}) {
  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : null;
  return (
    <div
      className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors"
      onClick={onToggle}
      data-ai-role="group"
    >
      <button
        type="button"
        aria-label={expanded ? 'Collapse' : 'Expand'}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="flex size-4 shrink-0 items-center justify-center text-muted-foreground"
      >
        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      </button>
      {meta.icon ? <span className="shrink-0">{meta.icon}</span> : null}
      <span className="truncate text-sm font-semibold text-muted-foreground">{meta.label}</span>
      <span className="shrink-0 text-xs font-mono text-muted-foreground/50">{count}</span>

      {/* 弹性占位，把进度条与添加按钮推到最右 */}
      <span className="flex-1" />

      {progress ? (
        <span className="flex shrink-0 items-center gap-2">
          {/* 进度条固定长度 */}
          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
            <span
              className={cn('block h-full rounded-full transition-all', pct === 100 ? 'bg-accent-green' : 'bg-primary')}
              style={{ width: `${pct ?? 0}%` }}
            />
          </span>
          <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted-foreground">{progress.done}/{progress.total}</span>
        </span>
      ) : null}

      {onAdd ? (
        <button
          type="button"
          aria-label="Add"
          title="Add"
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground opacity-0 group-hover:opacity-100"
        >
          <Plus className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

// ============================================================================
// 内部：多选悬浮胶囊
// ============================================================================

function SelectionBar<T extends DataListItem>({
  selected,
  actions,
  count,
  total,
  onClose,
}: {
  selected: T[];
  actions: DataListProps<T>['selectionActions'];
  count: number;
  total?: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const summaryText =
    typeof total === 'number' && total > 0
      ? t('dataTable.selectedWithTotal', { count, total })
      : t('dataTable.selected', { count });

  return (
    <div className="pointer-events-none fixed bottom-28 left-1/2 z-modal -translate-x-1/2 transition-all duration-normal">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-2 shadow-xs">
        <span className="px-2 text-sm font-semibold tabular-nums">{summaryText}</span>
        {actions ? <div className="flex items-center gap-1">{actions(selected, onClose)}</div> : null}
        <button
          type="button"
          aria-label={t('common.close', { defaultValue: 'Close' })}
          title={t('common.close', { defaultValue: 'Close' })}
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 内部：加载骨架（行结构对齐 Row / GroupBar 真实布局）
// ============================================================================

/** 骨架行标题条的宽度档位（交错宽度更接近真实数据的长短分布） */
const ROW_TITLE_WIDTHS = ['w-1/4', 'w-2/5', 'w-1/3', 'w-1/2', 'w-1/5', 'w-1/3'];

export function DataListSkeleton({ grouping = false }: { grouping?: boolean }) {
  return (
    <div className="bg-background" aria-busy="true">
      {grouping ? (
        // 分组条骨架：展开符 + 圆点图标 + 标签 + 计数 + 右侧进度条
        <div className="flex items-center gap-3 px-4 py-2.5">
          <Skeleton className="size-4 rounded-sm" />
          <Skeleton className="size-3.5 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-6 rounded-full" />
          <span className="flex-1" />
          <Skeleton className="h-1.5 w-24 rounded-full" />
          <Skeleton className="h-3 w-8" />
        </div>
      ) : null}
      {ROW_TITLE_WIDTHS.map((width, index) => (
        <div key={index} className="flex items-center gap-2.5 px-4 py-2">
          <div className="w-7 shrink-0" />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Skeleton className="size-7 shrink-0 rounded-md" />
            <Skeleton className={cn('h-4', width)} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Skeleton className="h-5 w-14 rounded-sm" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="size-6 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// DataList 主组件
// ============================================================================

export function DataList<T extends DataListItem>({
  items,
  loading,
  size = 'dense',
  emptyMessage,
  emptyDescription,
  emptyIcon,
  className,
  totalCount,
  renderLeading,
  renderTrailing,
  renderChildren,
  onItemClick,
  onItemContextMenu,
  groupBy,
  groupLabel,
  renderGroupProgress,
  onGroupCreate,
  selectable = false,
  selectedIds,
  onSelectionChange,
  selectionActions,
}: DataListProps<T>) {
  const { t } = useTranslation();
  // 多选状态：受控优先，否则内部维护
  const [internalSelected, setInternalSelected] = useState<Set<string>>(() => new Set());
  const selected = selectedIds ?? internalSelected;
  const setSelected = (next: Set<string>) => {
    if (onSelectionChange) onSelectionChange(next);
    setInternalSelected(next);
  };

  // §21.3：toggleSelect 引用稳定（deps 只随选中集变化），Row memo 才能在渐进补挂/键盘流时跳过未受影响行
  const toggleSelect = useCallback(
    (id: string) => {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelected(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, onSelectionChange],
  );

  const clearSelection = () => setSelected(new Set());

  // §21.1 渐进挂载（渲染窗口阀门）：超阈值清单首屏只挂 THRESHOLD 行，按帧分批补齐；
  // items 变化（新数据/新筛选）重置首屏预算；测试环境短路全量渲染（GAP-T-55 判定依据）
  const initialBudget = Math.min(
    items.length,
    IS_TEST_ENV ? items.length : PROGRESSIVE_MOUNT_THRESHOLD,
  );
  const [mountBudget, setMountBudget] = useState(initialBudget);
  useEffect(() => {
    setMountBudget(initialBudget);
  }, [initialBudget]);
  useEffect(() => {
    if (mountBudget >= items.length || typeof requestAnimationFrame !== 'function') return;
    const raf = requestAnimationFrame(() => {
      setMountBudget((prev) => Math.min(items.length, prev + PROGRESSIVE_MOUNT_CHUNK));
    });
    return () => cancelAnimationFrame(raf);
  }, [mountBudget, items.length]);

  // §21.4 数据窗口：Dev 模式超预算告警一次（提示走筛选/分组/分页，不静默截断数据）
  const budgetWarnedRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (items.length <= DEV_ROW_BUDGET_WARN) {
      budgetWarnedRef.current = false;
      return;
    }
    if (budgetWarnedRef.current) return;
    budgetWarnedRef.current = true;
    console.warn(
      `[DataList] ${items.length} 行超过渲染预算（${DEV_ROW_BUDGET_WARN}）：渲染阀门已生效（宪法 §21），如仍卡顿请为页面接筛选/分组/分页——勿静默截断数据。`,
    );
  }, [items.length]);

  // 分组
  const isGrouping = !!groupBy;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // 键盘行光标（宪法 §8.2：↑↓/j/k 移动、Enter 打开、Escape 清除）
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const groups = useMemo(() => {
    if (!groupBy) return [] as { meta: DataListGroupMeta; items: T[] }[];
    const buckets = new Map<string, T[]>();
    items.forEach((item) => {
      const key = groupBy(item);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(item);
    });
    const arr = Array.from(buckets.entries()).map(([key, list]) => {
      const metaOverride = groupLabel?.(key, list) ?? {};
      const meta: DataListGroupMeta = {
        key,
        label: metaOverride.label ?? key,
        icon: metaOverride.icon,
        order: metaOverride.order,
      };
      return { meta, items: list };
    });
    arr.sort((a, b) => (a.meta.order ?? 0) - (b.meta.order ?? 0));
    return arr;
  }, [items, groupBy, groupLabel]);

  const toggleGroup = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  // 可见行 = 顶层项展开后的扁平序列（子行一并纳入键盘流与多选集合）
  const visibleItems = useMemo(() => {
    const tops = isGrouping
      ? groups.flatMap(({ meta, items: list }) => (collapsed[meta.key] ? [] : list))
      : items;
    if (!renderChildren) return tops;
    const out: T[] = [];
    const walk = (list: T[]) =>
      list.forEach((it) => {
        out.push(it);
        walk(renderChildren?.(it) ?? []);
      });
    walk(tops);
    return out;
  }, [isGrouping, groups, collapsed, items, renderChildren]);

  const selectedItems = useMemo(() => visibleItems.filter((it) => selected.has(it.id)), [visibleItems, selected]);

  const moveActive = (delta: number) => {
    if (visibleItems.length === 0) return;
    const idx = visibleItems.findIndex((it) => it.id === activeId);
    const next =
      idx === -1
        ? delta > 0
          ? 0
          : visibleItems.length - 1
        : Math.min(visibleItems.length - 1, Math.max(0, idx + delta));
    const target = visibleItems[next];
    setActiveId(target.id);
    requestAnimationFrame(() => {
      const el = containerRef.current?.querySelector(`[data-row-id="${CSS.escape(target.id)}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    });
  };

  // 键盘流只在列表容器自身聚焦时接管：焦点落在行内交互元素（checkbox/链接/按钮/输入框）
  // 时按键交还原生行为，避免 Enter/Space 双触发与 j/k 干扰，也不与命令面板/表单快捷键冲突
  const isInteractiveTarget = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (e.target === e.currentTarget) return false;
    return !!(e.target as HTMLElement).closest(
      'button, a, input, textarea, select, [contenteditable="true"]',
    );
  };

  const handleContainerFocus = () => {
    // 聚焦即激活首行（Tab 进入后直接可 Enter/x 操作，无需先按 j 探路）
    if (!activeId && visibleItems.length > 0) setActiveId(visibleItems[0].id);
  };

  const handleContainerClickCapture = (e: React.MouseEvent) => {
    if (isInteractiveTarget(e)) return;
    // 先聚焦（触发 onFocus 激活首行），再覆盖为被点击的行——
    // 此前点击不可聚焦的行 div 会把焦点丢回 body，键盘流随之中断
    containerRef.current?.focus({ preventScroll: true });
    const rowEl = (e.target as HTMLElement).closest<HTMLElement>('[data-row-id]');
    if (rowEl?.dataset.rowId) setActiveId(rowEl.dataset.rowId);
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (isInteractiveTarget(e)) return;
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      moveActive(-1);
    } else if ((e.key === 'x' || e.key === 'X' || e.key === ' ') && selectable && activeId) {
      // x / space 切换当前行选中：走既有 selectable 契约（受控 onSelectionChange 或内部状态，
      // 悬浮胶囊与页面批量操作随选中状态联动）
      e.preventDefault();
      toggleSelect(activeId);
    } else if (e.key === 'Enter' || (e.key === ' ' && !selectable)) {
      if (activeId && onItemClick) {
        const item = visibleItems.find((it) => it.id === activeId);
        if (item) {
          e.preventDefault();
          onItemClick(item);
        }
      }
    } else if (e.key === 'Escape') {
      clearSelection();
      setActiveId(null);
    }
  };

  // 加载 / 空态
  if (loading) {
    return <div className={cn('relative', className)}><DataListSkeleton grouping={isGrouping} /></div>;
  }

  if (items.length === 0) {
    // emptyMessage 传完整空态元素（如带 IconStack 的 page 变体）时直接渲染，避免套成「EmptyState 套 EmptyState」
    if (isValidElement(emptyMessage)) {
      return <>{emptyMessage}</>;
    }
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyMessage ?? t('dataTable.empty', '暂无数据')}
        description={emptyDescription}
        className={className}
      />
    );
  }

  // §21.1 渲染窗口：全局渐进预算按渲染段顺序扣减（未分组=整表一段；分组=各组各一段），
  // 未挂区以行高档位估算高度的占位撑住滚动条，滚动条不随批次跳动
  let budgetLeft = Math.min(mountBudget, items.length);
  const renderSegment = (list: T[]) => {
    const take = Math.min(list.length, budgetLeft);
    budgetLeft -= take;
    const rows = list.slice(0, take).map((item) => (
      <Row
        key={item.id}
        item={item}
        size={size}
        selectable={selectable}
        selectedIds={selected}
        onToggleSelect={toggleSelect}
        renderLeading={renderLeading}
        renderTrailing={renderTrailing}
        renderChildren={renderChildren}
        onItemClick={onItemClick}
        onItemContextMenu={onItemContextMenu}
        isActive={activeId === item.id}
      />
    ));
    const rest = list.length - take;
    return rest > 0 ? (
      <>
        {rows}
        <div aria-hidden="true" style={{ height: rest * ROW_PLACEHOLDER_HEIGHT[size] }} />
      </>
    ) : (
      <>{rows}</>
    );
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleListKeyDown}
      onFocus={handleContainerFocus}
      onClickCapture={handleContainerClickCapture}
      className={cn('relative outline-none focus-visible:ring-2 focus-visible:ring-ring/40', className)}
      aria-label="List. Use arrow keys or j/k to navigate, Enter to open, x or space to select, Escape to clear."
    >
      {isGrouping ? (
        <div className="flex flex-col gap-3">
          {groups.map(({ meta, items: list }) => {
            const isCollapsed = collapsed[meta.key] ?? false;
            const progress = renderGroupProgress?.(list) ?? null;
            return (
              <div key={meta.key} data-group={meta.key}>
                <div className="group sticky top-0 z-sticky bg-background">
                  <GroupBar
                    meta={meta}
                    count={list.length}
                    expanded={!isCollapsed}
                    onToggle={() => toggleGroup(meta.key)}
                    progress={progress}
                    onAdd={onGroupCreate ? () => onGroupCreate(meta.key, list) : undefined}
                  />
                </div>
                {!isCollapsed ? (
                  <div>{renderSegment(list)}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        renderSegment(items)
      )}

      {selectable && selected.size > 0 ? (
        <SelectionBar
          selected={selectedItems}
          actions={selectionActions}
          count={selected.size}
          total={totalCount ?? items.length}
          onClose={clearSelection}
        />
      ) : null}
    </div>
  );
}

// 供需要空状态图标/占位使用
export const DataListIcons = { Circle: CircleIcon, Plus, Check, X, ChevronDown, ChevronRight, User: UserIcon };
