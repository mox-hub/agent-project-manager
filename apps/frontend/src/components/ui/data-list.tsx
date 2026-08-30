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

import { useMemo, useRef, useState, type ReactNode } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';

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

export interface DataListProps<T extends DataListItem> {
  items: T[];
  loading?: boolean;
  emptyMessage?: ReactNode;
  className?: string;

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
  color,
}: {
  name?: string;
  url?: string | null;
  color?: string;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? ''}
        className="size-6 shrink-0 rounded-full object-cover"
        title={name}
      />
    );
  }
  const initial = (name ?? '').trim().split(/\s+/).filter(Boolean);
  const text = initial.length === 0 ? '' : initial.length === 1 ? initial[0].slice(0, 2).toUpperCase() : (initial[0][0] + initial[1][0]).toUpperCase();
  return (
    <span
      title={name}
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-10 font-semibold text-white"
      style={{ backgroundColor: color || 'hsl(var(--primary))' }}
    >
      {text || <UserIcon className="size-3 opacity-60" />}
    </span>
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
    <div className="w-7 shrink-0 flex items-center justify-center">
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          'flex size-4 items-center justify-center rounded-5 border transition-all outline-hidden',
          selected
            ? 'border-primary bg-primary text-primary-foreground opacity-100'
            : 'border-muted-foreground/40 text-transparent opacity-0 group-hover:opacity-100 hover:opacity-100',
        )}
      >
        <Check className="size-3" strokeWidth={3} />
      </button>
    </div>
  );
}

// ============================================================================
// 内部：单行
// ============================================================================

function Row<T extends DataListItem>({
  item,
  selectable,
  isSelected,
  onToggleSelect,
  renderLeading,
  renderTrailing,
  renderChildren,
  onItemClick,
  onItemContextMenu,
  indent,
  isActive,
}: {
  item: T;
  selectable: boolean;
  isSelected: (item: T) => boolean;
  onToggleSelect: (id: string) => void;
  renderLeading?: (item: T) => ReactNode;
  renderTrailing?: (item: T) => ReactNode;
  renderChildren?: (item: T) => T[];
  onItemClick?: (item: T) => void;
  onItemContextMenu?: (item: T) => MenuItem[] | undefined;
  indent?: boolean;
  /** 键盘行光标（宪法 §8.2）：bg-accent 与 selected 同 token */
  isActive?: boolean;
}) {
  const children = renderChildren?.(item) ?? [];
  const rowContent = (
    <div
      data-row-id={item.id}
      className={cn(
        'group flex items-center gap-2.5 px-2 py-2 transition-colors',
        indent ? 'bg-muted/5 pl-7' : '',
        onItemClick ? 'cursor-pointer hover:bg-accent/20' : 'hover:bg-accent/10',
        isActive && 'bg-accent',
      )}
      onClick={onItemClick ? () => onItemClick(item) : undefined}
    >
      <SelectCell hidden={!selectable} selected={isSelected(item)} onToggle={() => onToggleSelect(item.id)} />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {renderLeading ? renderLeading(item) : null}
      </div>
      {renderTrailing ? (
        <div className="flex shrink-0 items-center gap-2">{renderTrailing(item)}</div>
      ) : null}
    </div>
  );

  const menuItems = onItemContextMenu?.(item);

  return (
    <>
      {menuItems?.length ? (
        <ContextMenu items={menuItems}>
          {rowContent}
        </ContextMenu>
      ) : (
        rowContent
      )}
      {children.map((child) => (
        <Row
          key={child.id}
          item={child}
          selectable={selectable}
          isSelected={isSelected}
          onToggleSelect={onToggleSelect}
          renderLeading={renderLeading}
          renderTrailing={renderTrailing}
          renderChildren={renderChildren}
          onItemClick={onItemClick}
          onItemContextMenu={onItemContextMenu}
          indent
        />
      ))}
    </>
  );
}

// ============================================================================
// 内部：grouping bar
// ============================================================================

function GroupBar<T extends DataListItem>({
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
      className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors"
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
  onClose,
}: {
  selected: T[];
  actions: DataListProps<T>['selectionActions'];
  count: number;
  onClose: () => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-2 shadow-lg">
        <span className="px-2 text-sm font-semibold tabular-nums">{count} selected</span>
        {actions ? <div className="flex items-center gap-1">{actions(selected, onClose)}</div> : null}
        <button
          type="button"
          aria-label="Close"
          title="Close"
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

function DataListSkeleton({ grouping }: { grouping: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background" aria-busy="true">
      {grouping ? (
        // 分组条骨架：展开符 + 圆点图标 + 标签 + 计数 + 右侧进度条
        <div className="flex items-center gap-3 px-3 py-2.5">
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
        <div key={index} className="flex items-center gap-2.5 px-2 py-2">
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
  emptyMessage = 'No items',
  className,
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
  // 多选状态：受控优先，否则内部维护
  const [internalSelected, setInternalSelected] = useState<Set<string>>(() => new Set());
  const selected = selectedIds ?? internalSelected;
  const setSelected = (next: Set<string>) => {
    if (onSelectionChange) onSelectionChange(next);
    setInternalSelected(next);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const clearSelection = () => setSelected(new Set());
  const selectedItems = useMemo(() => items.filter((it) => selected.has(it.id)), [items, selected]);

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
      const first = list[0];
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

  const visibleItems = useMemo(() => {
    if (isGrouping) {
      return groups.flatMap(({ meta, items: list }) => (collapsed[meta.key] ? [] : list));
    }
    return items;
  }, [isGrouping, groups, collapsed, items]);

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

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      moveActive(-1);
    } else if ((e.key === 'Enter' || e.key === ' ') && activeId && onItemClick) {
      const item = visibleItems.find((it) => it.id === activeId);
      if (item) {
        e.preventDefault();
        onItemClick(item);
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
    return (
      <div className={cn('rounded-lg border border-border bg-background py-16 text-center text-xs text-muted-foreground', className)}>
        {emptyMessage}
      </div>
    );
  }

  const renderRowList = (list: T[]) => (
    <div className={cn(!isGrouping && 'rounded-lg border border-border bg-background overflow-hidden')}>
      {list.map((item) => (
        <Row
          key={item.id}
          item={item}
          selectable={selectable}
          isSelected={(it) => selected.has(it.id)}
          onToggleSelect={toggleSelect}
          renderLeading={renderLeading}
          renderTrailing={renderTrailing}
          renderChildren={renderChildren}
          onItemClick={onItemClick}
          onItemContextMenu={onItemContextMenu}
          isActive={activeId === item.id}
        />
      ))}
    </div>
  );

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleListKeyDown}
      className={cn('relative outline-none', className)}
      aria-label="List. Use arrow keys to navigate, Enter to open."
    >
      {isGrouping ? (
        <div className="flex flex-col gap-2">
          {groups.map(({ meta, items: list }) => {
            const isCollapsed = collapsed[meta.key] ?? false;
            const progress = renderGroupProgress?.(list) ?? null;
            return (
              <div
                key={meta.key}
                className={cn('overflow-hidden rounded-lg border border-border bg-background', isCollapsed && '')}
                data-group={meta.key}
              >
                <div className="group">
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
                  <div className="border-t border-border/40">
                    {list.map((item) => (
                      <Row
                        key={item.id}
                        item={item}
                        selectable={selectable}
                        isSelected={(it) => selected.has(it.id)}
                        onToggleSelect={toggleSelect}
                        renderLeading={renderLeading}
                        renderTrailing={renderTrailing}
                        renderChildren={renderChildren}
                        onItemClick={onItemClick}
                        onItemContextMenu={onItemContextMenu}
                        isActive={activeId === item.id}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        renderRowList(items)
      )}

      {selectable && selected.size > 0 ? (
        <SelectionBar selected={selectedItems} actions={selectionActions} count={selected.size} onClose={clearSelection} />
      ) : null}
    </div>
  );
}

// 供需要空状态图标/占位使用
export const DataListIcons = { Circle: CircleIcon, Plus, Check, X, ChevronDown, ChevronRight, User: UserIcon };
