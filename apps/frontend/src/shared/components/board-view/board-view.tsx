/**
 * BoardView - 通用看板视图组件（@dnd-kit）
 *
 * 能力：
 * - 列由页面传入（自定义分组），item 通过 groupBy 归列
 * - 卡片拖拽：列内重排（本地生效）+ 跨列移动（onItemMove 回调，乐观更新内部顺序）
 * - 列主题色：图标/列头/计数胶囊/列背景/边框同色系（accent 语义色）
 * - 默认三行卡片（行1 元信息 / 行2 标题 / 行3 meta+子任务图标），槽位全部可覆盖；
 *   renderCard 可完全自定义
 * - 滚动：看板高度按视口封顶（max-h，可由页面覆盖），列头固定在区域顶部；
 *   每列内容单独纵向滚动但隐藏纵向滚动条，可见滚动条仅看板底部横向一条；
 *   列宽 min 200 / max 400 并平分剩余宽度，5 列可完整落入第一屏
 * - 可选列拖拽重排（enableColumnReorder）、WIP 限制、空列 drop 区、拖拽 overlay
 */
import { useMemo, useRef, useState, type ReactNode } from 'react';
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
  /** 单卡片附加样式（如 severity 左边框） */
  className?: (item: T) => string;
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
  /** 列拖拽重排（默认关闭） */
  enableColumnReorder?: boolean;
  onColumnReorder?: (columnIds: string[]) => void;
  /** 完全自定义卡片（返回完整卡片节点，包括容器） */
  renderCard?: (item: T, column: BoardColumnDef) => ReactNode;
  /** 默认卡片槽位模型（renderCard 未提供时生效） */
  card: BoardCardModel<T>;
  /** 空列占位内容 */
  emptyColumnState?: ReactNode;
  loading?: boolean;
  className?: string;
  /** 列尺寸类：默认 min 200 / max 400 且 flex 平分剩余宽度，5 列可完整落入第一屏 */
  columnWidthClassName?: string;
}

/** 空列/目标列 drop 区最小高度 */
const DROP_ZONE_MIN_HEIGHT = 140;

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
  enableColumnReorder = false,
  onColumnReorder,
  renderCard,
  card,
  emptyColumnState,
  loading = false,
  className,
  columnWidthClassName = 'min-w-50 max-w-100 flex-1 basis-0',
}: BoardViewProps<T>) {
  const { t } = useTranslation();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
        className={cn('flex h-full flex-col max-h-[calc(100dvh-200px)] min-h-80', className)}
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
    // 高度封顶（视口减去页头/工具栏等固定 chrome ≈200px）：列头固定在区域顶部、
    // 列内卡片纵向滚动、横向滚动条固定在区域底部；页面可用 className 传入自己的
    // max-h-* 覆盖默认上限（tailwind-merge 生效）。
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
        className={cn(
          'flex h-full flex-col max-h-[calc(100dvh-200px)] min-h-80',
          className,
        )}
      >
        {/* 列区：唯一可见滚动条（横向）；每列内容区各自纵向滚动但隐藏滚动条 */}
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
            // 纵向滚动但隐藏滚动条：滚动条只保留看板底部横向一条
            'flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            isBodyOver && hasActiveItem && 'bg-background/40',
          )}
          data-board-column-body={column.id}
        >
          {loading && itemIds.length === 0
            ? [0, 1].map((index) => <BoardCardSkeleton key={index} />)
            : itemIds.map((itemId) => {
                const item = itemMap.get(itemId);
                if (!item) return null;
                return (
                  <BoardCardView
                    key={itemId}
                    itemId={itemId}
                    columnId={column.id}
                    dimmed={false}
                  >
                    {renderCardContent(item, column)}
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
  return (
    <article
      onClick={onClick}
      className={cn(
        'space-y-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-xs transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-md dark:shadow-none',
        overlay && 'rotate-0 shadow-xl',
        card.className?.(item),
      )}
      data-board-card-id={item.id}
      data-board-column={column.id}
    >
      {card.row1 ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {card.row1(item)}
        </div>
      ) : null}
      <h4 className="line-clamp-2 text-sm font-semibold leading-[1.35] text-foreground">
        {card.title(item)}
      </h4>
      {card.row3 ? <div className="text-xs text-muted-foreground">{card.row3(item)}</div> : null}
    </article>
  );
}
