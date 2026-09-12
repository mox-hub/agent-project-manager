/**
 * BoardView - 通用看板视图组件（@dnd-kit）
 *
 * 能力：
 * - 列由页面传入（自定义分组），item 通过 groupBy 归列
 * - 卡片拖拽：列内重排（本地生效）+ 跨列移动（onItemMove 回调，乐观更新内部顺序）
 * - 列主题色：图标/列头/计数胶囊/列背景/边框同色系（accent 语义色）
 * - 默认三行卡片（行1 元信息 / 行2 标题 / 行3 meta+子任务图标），槽位全部可覆盖；
 *   renderCard 可完全自定义
 * - 滚动：看板高度自动充满「自身顶部 → 视口底部」剩余空间（保留底边距，页面不再因看板滚动），
 *   列头固定在列顶，每列内容纵向滚动且显示可见滚动条；
 *   列宽固定一致（默认 w-72 / 288px），多列超出容器时仅看板区内底部一条横向滚动
 * - 右键菜单：传入 onItemContextMenu（返回 MenuItem[]）时卡片包裹与列表行一致的 ContextMenu
 * - 可选列拖拽重排（enableColumnReorder）、WIP 限制、空列 drop 区、拖拽 overlay
 */
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ContextMenu, type MenuItem } from '@/components/ui/context-menu';
import { useTranslation } from 'react-i18next';

/** 列主题色（accent 语义色） */
export type BoardAccentColor = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'muted';

const ACCENT_THEME: Record<
  BoardAccentColor,
  { iconText: string; headerText: string; headerBg: string; badge: string; badgeWipExceeded: string; columnBg: string; columnBorder: string }
> = {
  blue: {
    iconText: 'text-accent-blue',
    headerText: 'text-accent-blue',
    headerBg: 'bg-accent-blue-light/30',
    badge: 'bg-accent-blue-light/50 text-accent-blue',
    badgeWipExceeded: 'bg-accent-red-light/60 text-accent-red',
    columnBg: 'bg-accent-blue-light/15',
    columnBorder: 'border-accent-blue/20',
  },
  green: {
    iconText: 'text-accent-green',
    headerText: 'text-accent-green',
    headerBg: 'bg-accent-green-light/30',
    badge: 'bg-accent-green-light/50 text-accent-green',
    badgeWipExceeded: 'bg-accent-red-light/60 text-accent-red',
    columnBg: 'bg-accent-green-light/15',
    columnBorder: 'border-accent-green/20',
  },
  yellow: {
    iconText: 'text-accent-yellow',
    headerText: 'text-accent-yellow',
    headerBg: 'bg-accent-yellow-light/30',
    badge: 'bg-accent-yellow-light/50 text-accent-yellow',
    badgeWipExceeded: 'bg-accent-red-light/60 text-accent-red',
    columnBg: 'bg-accent-yellow-light/15',
    columnBorder: 'border-accent-yellow/20',
  },
  red: {
    iconText: 'text-accent-red',
    headerText: 'text-accent-red',
    headerBg: 'bg-accent-red-light/30',
    badge: 'bg-accent-red-light/50 text-accent-red',
    badgeWipExceeded: 'bg-accent-red-light/60 text-accent-red',
    columnBg: 'bg-accent-red-light/15',
    columnBorder: 'border-accent-red/20',
  },
  purple: {
    iconText: 'text-accent-purple',
    headerText: 'text-accent-purple',
    headerBg: 'bg-accent-purple-light/30',
    badge: 'bg-accent-purple-light/50 text-accent-purple',
    badgeWipExceeded: 'bg-accent-red-light/60 text-accent-red',
    columnBg: 'bg-accent-purple-light/15',
    columnBorder: 'border-accent-purple/20',
  },
  muted: {
    iconText: 'text-muted-foreground',
    headerText: 'text-muted-foreground',
    headerBg: 'bg-muted/30',
    badge: 'bg-muted/50 text-muted-foreground',
    badgeWipExceeded: 'bg-accent-red-light/60 text-accent-red',
    columnBg: 'bg-muted/20',
    columnBorder: 'border-border',
  },
};

export interface BoardColumnDef {
  id: string;
  title: ReactNode;
  icon?: LucideIcon;
  color?: BoardAccentColor;
  /** 超过该数量时计数胶囊转警示色 */
  wipLimit?: number;
  /** 列头右侧追加按钮（位于默认添加按钮左侧） */
  actions?: ReactNode;
}

/** 默认三行卡片的槽位模型：每一行都支持页面自定义 */
export interface BoardCardModel<T extends { id: string }> {
  /** 行2：标题（卡片内字号最大） */
  title: (item: T) => ReactNode;
  /** 行1：重要性 / 任务编号 / 状态等元信息 */
  row1?: (item: T) => ReactNode;
  /** 行3：其他信息 + 子任务图标等 */
  row3?: (item: T) => ReactNode;
  /** 是否处于 AI 执行接管状态 */
  isAiExecuting?: (item: T) => boolean;
  /** AI 执行状态微胶囊节点 */
  aiExecutionNode?: (item: T) => ReactNode;
  /** 单卡片附加样式（如 severity 左边框） */
  className?: (item: T) => string;
  /** CAP-C-07 局部侵入问答实体指针（如 `project:${id}`；返回 undefined 则不接） */
  dataEntity?: (item: T) => string | undefined;
}

export interface BoardViewProps<T extends { id: string }> {
  columns: BoardColumnDef[];
  items: T[];
  /** item → 列 id；未命中任何列定义的 item 不展示 */
  groupBy: (item: T) => string;
  /** 列内初始排序；缺省保持 items 传入顺序 */
  orderBy?: (a: T, b: T) => number;
  /** 拖拽落点回调（跨列或列内重排均会触发；页面负责持久化属性，顺序默认仅本地生效） */
  onItemMove?: (item: T, toColumnId: string, toIndex: number) => void;
  /** 列头默认添加按钮 */
  onItemAdd?: (columnId: string) => void;
  onItemClick?: (item: T, columnId: string) => void;
  /** 卡片右键菜单（返回 MenuItem[]；与 DataList 行 onItemContextMenu 同构，返回空数组/undefined 则无菜单） */
  onItemContextMenu?: (item: T) => MenuItem[] | undefined;
  /** 列拖拽重排（默认关闭） */
  enableColumnReorder?: boolean;
  onColumnReorder?: (columnIds: string[]) => void;
  /** 折叠的列 ID 集合 */
  collapsedColumnIds?: string[];
  onToggleCollapseColumn?: (columnId: string) => void;
  /** 完全自定义卡片（返回完整卡片节点，包括容器） */
  renderCard?: (item: T, column: BoardColumnDef) => ReactNode;
  /** 默认卡片槽位模型（renderCard 未提供时生效） */
  card: BoardCardModel<T>;
  /** 空列占位内容 */
  emptyColumnState?: ReactNode;
  loading?: boolean;
  className?: string;
  /** 列尺寸类：默认固定一致列宽 w-72（288px），多列超出时看板区内横向滚动 */
  columnWidthClassName?: string;
}

/** 空列/目标列 drop 区最小高度 */
const DROP_ZONE_MIN_HEIGHT = 140;

/** 看板底部保留边距（对齐页面内容区 p-6 下边距），保证页面不产生纵向滚动 */
const BOARD_BOTTOM_GUTTER = 24;
/** 看板高度下限：低于该值不再压缩，避免极端窄屏下不可用 */
const BOARD_MIN_HEIGHT = 320;

/**
 * 让根容器高度 = 「自身顶部 → 视口底部」的剩余空间（保留底边距）。
 *
 * 背景：全局任务页等宿主把页面包在 shell ScrollArea 里，祖先链高度不定，
 * 仅靠 max-h 封顶会让 flex 主轴高度不定 → 列高按内容膨胀、卡片被裁断不可达。
 * 给根容器一个确定像素高即可让整条 flex 链（列行 items-stretch → 列 body flex-1）受约束。
 *
 * jsdom/隐藏容器 rect 为 0（无布局）时不动内联高，由 className（h-full）兜底，不破坏单测。
 * deps 变化（items/columns/loading）重测，覆盖上方筛选行等高度变化。
 */
function useFillViewportHeight(ref: RefObject<HTMLElement | null>, deps: unknown[]) {
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    let raf = 0;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= 0 && rect.height === 0) return; // 无布局 → 交给 class 兜底
      const available = window.innerHeight - rect.top - BOARD_BOTTOM_GUTTER;
      setHeight(Math.max(BOARD_MIN_HEIGHT, Math.round(available)));
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('resize', schedule);
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(schedule);
      ro.observe(el);
      return () => {
        ro.disconnect();
        window.removeEventListener('resize', schedule);
        cancelAnimationFrame(raf);
      };
    }
    return () => {
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(raf);
    };
    // 列/项变化重测；测量函数稳定，deps 仅控制何时重挂
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return height;
}

/** 卡片骨架：标题行 + 元信息行（左侧短条 + 右侧头像位），对齐默认卡片信息密度 */
function BoardCardSkeleton() {
  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-card p-2.5">
      <Skeleton className="h-3.5 w-2/3" />
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="size-5 rounded-full" />
      </div>
    </div>
  );
}

export function BoardView<T extends { id: string }>({
  columns,
  items,
  groupBy,
  orderBy,
  onItemMove,
  onItemAdd,
  onItemClick,
  onItemContextMenu,
  enableColumnReorder = false,
  onColumnReorder,
  renderCard,
  card,
  emptyColumnState,
  loading = false,
  className,
  columnWidthClassName = 'w-72 shrink-0',
}: BoardViewProps<T>) {
  const { t } = useTranslation();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** 看板根容器：高度自测充满视口剩余空间（见 useFillViewportHeight） */
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fillHeight = useFillViewportHeight(containerRef, [items, columns, loading]);

  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  /** 拖拽产生的本地顺序覆盖：columnId → itemId[] */
  const [manualOrder, setManualOrder] = useState<Record<string, string[]> | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  /** 拖拽结束后短暂抑制卡片 click（浏览器会在 drag 后补发 click） */
  const lastDragEndedAtRef = useRef(0);

  const effectiveColumns = useMemo(() => {
    if (!columnOrder) return columns;
    const byId = new Map(columns.map((column) => [column.id, column]));
    const ordered = columnOrder.map((id) => byId.get(id)).filter(Boolean) as typeof columns;
    for (const column of columns) {
      if (!columnOrder.includes(column.id)) ordered.push(column);
    }
    return ordered;
  }, [columns, columnOrder]);

  const itemMap = useMemo(() => {
    const map = new Map<string, T>();
    for (const item of items) map.set(item.id, item);
    return map;
  }, [items]);

  /** 由 props 推导的基础顺序（列定义顺序 + orderBy/传入顺序） */
  const baseOrder = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const column of effectiveColumns) map[column.id] = [];
    const ordered = orderBy ? [...items].sort(orderBy) : items;
    for (const item of ordered) {
      const columnId = groupBy(item);
      if (columnId in map) map[columnId].push(item.id);
    }
    return map;
    // groupBy 为页面内联函数时引用不稳定，依赖 effectiveColumns/items/orderBy 已足够
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveColumns, items, orderBy]);

  /** 基础顺序 + 本地拖拽顺序合并（容忍 items 增删：新 item 追加、失效 id 剔除） */
  const orderMap = useMemo(() => {
    if (!manualOrder) return baseOrder;
    const merged: Record<string, string[]> = {};
    for (const columnId of Object.keys(baseOrder)) {
      const baseIds = baseOrder[columnId];
      const manual = manualOrder[columnId] ?? [];
      const baseSet = new Set(baseIds);
      const manualSet = new Set(manual);
      merged[columnId] = [
        ...manual.filter((id) => baseSet.has(id)),
        ...baseIds.filter((id) => !manualSet.has(id)),
      ];
    }
    return merged;
  }, [baseOrder, manualOrder]);

  const findColumnOfItem = (itemId: string): string | null => {
    for (const [columnId, ids] of Object.entries(orderMap)) {
      if (ids.includes(itemId)) return columnId;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const type = event.active.data.current?.type;
    if (type === 'item') setActiveItemId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItemId(null);
    setDragOverColumnId(null);
    lastDragEndedAtRef.current = Date.now();
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // 列重排
    if (enableColumnReorder && activeData?.type === 'column' && overData?.type === 'column') {
      const oldIndex = effectiveColumns.findIndex((column) => column.id === active.id);
      const newIndex = effectiveColumns.findIndex((column) => column.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const next = [...effectiveColumns];
        const [moved] = next.splice(oldIndex, 1);
        next.splice(newIndex, 0, moved);
        const nextIds = next.map((column) => column.id);
        setColumnOrder(nextIds);
        onColumnReorder?.(nextIds);
      }
      return;
    }

    // 卡片拖拽
    if (activeData?.type !== 'item') return;
    const itemId = String(active.id);
    const item = itemMap.get(itemId);
    if (!item) return;

    const sourceColumnId = findColumnOfItem(itemId);
    if (!sourceColumnId) return;

    let targetColumnId: string;
    let insertIndex: number;
    if (overData?.type === 'item') {
      targetColumnId = String(overData.columnId);
      insertIndex = orderMap[targetColumnId]?.indexOf(String(over.id)) ?? -1;
      if (insertIndex === -1) insertIndex = orderMap[targetColumnId]?.length ?? 0;
    } else if (overData?.type === 'column-body') {
      targetColumnId = String(overData.columnId);
      insertIndex = orderMap[targetColumnId]?.length ?? 0;
    } else {
      return;
    }

    // 计算新顺序（乐观更新，页面 mutation 失败后由 items 刷新回同步）
    const nextOrder: Record<string, string[]> = {};
    for (const [columnId, ids] of Object.entries(orderMap)) {
      nextOrder[columnId] = ids.filter((id) => id !== itemId);
    }
    nextOrder[targetColumnId] = [
      ...(nextOrder[targetColumnId] ?? []),
    ];
    nextOrder[targetColumnId].splice(
      Math.min(insertIndex, nextOrder[targetColumnId].length),
      0,
      itemId,
    );
    setManualOrder(nextOrder);

    if (sourceColumnId !== targetColumnId) {
      onItemMove?.(item, targetColumnId, insertIndex);
    } else {
      // 列内重排：无持久化字段时仅本地生效，仍通知页面（可选持久化）
      onItemMove?.(item, targetColumnId, insertIndex);
    }
  };

  const activeItem = activeItemId ? itemMap.get(activeItemId) : undefined;
  const activeItemColumn = activeItem
    ? effectiveColumns.find((column) => column.id === findColumnOfItem(activeItem.id))
    : undefined;

  const handleCardClick = (item: T, columnId: string) => {
    if (Date.now() - lastDragEndedAtRef.current < 150) return;
    onItemClick?.(item, columnId);
  };

  const renderCardContent = (item: T, column: BoardColumnDef, overlay = false) => {
    if (renderCard) {
      return (
        <div
          className={cn(overlay ? 'w-72 rotate-2 shadow-xl' : 'w-full')}
          onClick={() => handleCardClick(item, column.id)}
        >
          {renderCard(item, column)}
        </div>
      );
    }
    return (
      <DefaultBoardCard
        item={item}
        column={column}
        card={card}
        overlay={overlay}
        onClick={() => handleCardClick(item, column.id)}
      />
    );
  };

  // 首屏加载骨架：无任何数据时以真实列头 + 卡片骨架占位（列结构由页面定义，加载期即可展示）
  if (loading && items.length === 0) {
    return (
      <div
        ref={containerRef}
        className={cn('flex h-full min-h-0 flex-col', className)}
        style={fillHeight ? { height: fillHeight } : undefined}
        aria-busy="true"
      >
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-1">
          <div className="flex h-full items-stretch gap-3">
            {columns.map((column) => {
              const Icon = column.icon;
              return (
                <section
                  key={column.id}
                  className={cn(
                    'flex flex-col overflow-hidden rounded-xl border border-border bg-muted/20',
                    columnWidthClassName,
                  )}
                >
                  <header className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-muted/40 px-3">
                    {Icon ? <Icon size={13} className="shrink-0 text-muted-foreground" /> : null}
                    <h3 className="truncate text-sm font-medium text-muted-foreground">{column.title}</h3>
                    <Skeleton className="h-4 w-6 rounded-full" />
                  </header>
                  <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
                    {[0, 1, 2].map((index) => (
                      <BoardCardSkeleton key={index} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    // 高度由 useFillViewportHeight 自测充满「自身顶部 → 视口底部」（保留底边距），
    // 使列行 items-stretch 与列 body flex-1 的 flex 链受确定高度约束：
    // 列头固定在列顶、列内纵向滚动，整板不产生页面级滚动。
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveItemId(null);
        setDragOverColumnId(null);
        lastDragEndedAtRef.current = Date.now();
      }}
      onDragOver={(event) => {
        const overData = event.over?.data.current;
        if (overData?.type === 'item') setDragOverColumnId(String(overData.columnId));
        else if (overData?.type === 'column-body') setDragOverColumnId(String(overData.columnId));
        else setDragOverColumnId(null);
      }}
    >
      <div
        ref={containerRef}
        className={cn('flex h-full min-h-0 flex-col', className)}
        style={fillHeight ? { height: fillHeight } : undefined}
      >
        {/* 列区：横向滚动仅在看板区内（多列固定宽超出容器时）；纵向滚动交给每列 body */}
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-1">
          <SortableContext
            items={effectiveColumns.map((column) => column.id)}
            strategy={horizontalListSortingStrategy}
            disabled={!enableColumnReorder}
          >
            <div className="flex h-full items-stretch gap-3">
              {effectiveColumns.map((column) => (
                <BoardColumnView<T>
                  key={column.id}
                  column={column}
                  itemIds={orderMap[column.id] ?? []}
                  itemMap={itemMap}
                  loading={loading}
                  enableColumnDrag={enableColumnReorder}
                  isDropTarget={dragOverColumnId === column.id && activeItemId !== null}
                  hasActiveItem={activeItemId !== null}
                  emptyColumnState={
                    emptyColumnState ?? (
                      <span className="text-xs text-muted-foreground">
                        {t('task.board.emptyColumn', { defaultValue: '拖拽卡片到此列' })}
                      </span>
                    )
                  }
                  addButtonLabel={t('task.board.addCard', { defaultValue: 'Add card' })}
                  onItemAdd={onItemAdd}
                  renderCardContent={renderCardContent}
                  onItemContextMenu={onItemContextMenu}
                  columnWidthClassName={columnWidthClassName}
                />
              ))}
            </div>
          </SortableContext>
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
          {activeItem && activeItemColumn
            ? renderCardContent(activeItem, activeItemColumn, true)
            : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

interface BoardColumnViewProps<T extends { id: string }> {
  column: BoardColumnDef;
  itemIds: string[];
  itemMap: Map<string, T>;
  loading: boolean;
  enableColumnDrag: boolean;
  isDropTarget: boolean;
  hasActiveItem: boolean;
  emptyColumnState: ReactNode;
  addButtonLabel: string;
  onItemAdd?: (columnId: string) => void;
  renderCardContent: (item: T, column: BoardColumnDef, overlay?: boolean) => ReactNode;
  onItemContextMenu?: (item: T) => MenuItem[] | undefined;
  columnWidthClassName: string;
}

function BoardColumnView<T extends { id: string }>({
  column,
  itemIds,
  itemMap,
  loading,
  enableColumnDrag,
  isDropTarget,
  hasActiveItem,
  emptyColumnState,
  addButtonLabel,
  onItemAdd,
  renderCardContent,
  onItemContextMenu,
  columnWidthClassName,
}: BoardColumnViewProps<T>) {
  const theme = ACCENT_THEME[column.color ?? 'muted'];
  const Icon = column.icon;
  const overWip = typeof column.wipLimit === 'number' && itemIds.length > column.wipLimit;

  const sortable = useSortable({
    id: column.id,
    data: { type: 'column' },
    disabled: !enableColumnDrag,
  });

  const { setNodeRef: setBodyNodeRef, isOver: isBodyOver } = useDroppable({
    id: `${column.id}::body`,
    data: { type: 'column-body', columnId: column.id },
  });

  return (
    <section
      ref={enableColumnDrag ? sortable.setNodeRef : undefined}
      style={
        enableColumnDrag
          ? { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }
          : undefined
      }
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border transition-colors',
        columnWidthClassName,
        theme.columnBg,
        theme.columnBorder,
        isDropTarget && 'ring-2 ring-accent-blue/25',
        enableColumnDrag && 'cursor-grab',
        enableColumnDrag && sortable.isDragging && 'opacity-70',
      )}
      data-board-column-id={column.id}
    >
      {/* 列头：图标 + 标题 + 计数 | 按钮组（默认添加） */}
      <header
        className={cn(
          'flex h-10 shrink-0 items-center justify-between gap-2 border-b px-3',
          theme.headerBg,
          theme.columnBorder,
        )}
        {...(enableColumnDrag ? { ...sortable.attributes, ...sortable.listeners } : {})}
      >
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? (
            <Icon
              size={13}
              className={cn('shrink-0', theme.iconText, column.id === 'in_progress' ? 'animate-spin [animation-duration:3s]' : '')}
            />
          ) : null}
          <h3 className={cn('truncate text-sm font-medium', theme.headerText)}>{column.title}</h3>
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none tabular-nums',
              overWip ? theme.badgeWipExceeded : theme.badge,
            )}
          >
            {itemIds.length}
          </span>
          {typeof column.wipLimit === 'number' ? (
            <span className="text-10 text-muted-foreground">
              WIP {itemIds.length}/{column.wipLimit}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {column.actions}
          {onItemAdd ? (
            <button
              type="button"
              className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground dark:hover:bg-muted/50"
              onClick={() => onItemAdd(column.id)}
              aria-label={addButtonLabel}
              title={addButtonLabel}
              data-board-column-add={column.id}
            >
              <Plus size={12} />
            </button>
          ) : null}
        </div>
      </header>

      {/* 列 body：纵向滚动 */}
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setBodyNodeRef}
          className={cn(
            // 列内纵向滚动：溢出列高时出现可见滚动条，列头固定在上方
            'flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2',
            isBodyOver && hasActiveItem && 'bg-background/40',
          )}
          data-board-column-body={column.id}
        >
          {loading && itemIds.length === 0
            ? [0, 1].map((index) => <BoardCardSkeleton key={index} />)
            : itemIds.map((itemId) => {
                const item = itemMap.get(itemId);
                if (!item) return null;
                const cardNode = renderCardContent(item, column);
                const menuItems = onItemContextMenu?.(item);
                return (
                  <BoardCardView
                    key={itemId}
                    itemId={itemId}
                    columnId={column.id}
                    dimmed={false}
                  >
                    {menuItems && menuItems.length > 0 ? (
                      // 与 DataList 行一致：卡片节点包右键菜单（onContextMenu 由 base-ui 注入）。
                      // compat ContextMenu 用 cloneElement 把触发器 props（onContextMenu/data-slot/aria…）
                      // 注入 children——children 必须是 DOM 元素或透传 props 的组件；
                      // DefaultBoardCard 只消费固定字段不透传，故先垫一层 contents 宿主承接再包卡片。
                      <ContextMenu items={menuItems}>
                        <div className="contents">{cardNode}</div>
                      </ContextMenu>
                    ) : (
                      cardNode
                    )}
                  </BoardCardView>
                );
              })}
          {!loading && itemIds.length === 0 ? (
            <div
              className={cn(
                'flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-card/85 p-3 text-center dark:bg-card/70',
                !hasActiveItem && 'min-h-35',
              )}
              style={hasActiveItem ? { minHeight: DROP_ZONE_MIN_HEIGHT } : undefined}
            >
              {emptyColumnState}
            </div>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}

function BoardCardView({
  itemId,
  columnId,
  dimmed,
  children,
}: {
  itemId: string;
  columnId: string;
  dimmed: boolean;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemId,
    data: { type: 'item', columnId },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('cursor-grab touch-none select-none active:cursor-grabbing', dimmed && isDragging && 'opacity-40')}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

/** 默认三行卡片：行1 元信息 / 行2 标题（最大字号）/ 行3 meta */
function DefaultBoardCard<T extends { id: string }>({
  item,
  column,
  card,
  overlay,
  onClick,
}: {
  item: T;
  column: BoardColumnDef;
  card: BoardCardModel<T>;
  overlay: boolean;
  onClick: () => void;
}) {
  const isAi = card.isAiExecuting?.(item);

  return (
    <article
      onClick={onClick}
      className={cn(
        'relative space-y-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-xs transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-md dark:shadow-none',
        isAi && 'border-accent-purple/50 ring-1 ring-accent-purple/30',
        overlay && 'rotate-0 shadow-xl',
        card.className?.(item),
      )}
      data-board-card-id={item.id}
      data-board-column={column.id}
      data-ai-entity={card.dataEntity?.(item)}
    >
      {isAi ? (
        <div
          className="h-1 -mx-3 -mt-2.5 mb-2 rounded-t-xl bg-accent-purple ring-1 ring-accent-purple/30 animate-pulse"
          title="AI 接管执行中"
        />
      ) : null}
      {card.row1 ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {card.row1(item)}
        </div>
      ) : null}
      <h4 className="line-clamp-2 text-sm font-semibold leading-[1.35] text-foreground">
        {card.title(item)}
      </h4>
      {isAi && card.aiExecutionNode ? (
        <div className="pt-0.5">{card.aiExecutionNode(item)}</div>
      ) : null}
      {card.row3 ? <div className="text-xs text-muted-foreground">{card.row3(item)}</div> : null}
    </article>
  );
}
