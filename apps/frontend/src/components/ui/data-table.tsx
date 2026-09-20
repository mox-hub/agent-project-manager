"use client"

/**
 * DataTable — 通用数据表（coss ui p-table-8 形态的泛化）
 * TanStack Table 无头核心 + shadcn Table 原语：
 * - 卡片式外壳（coss CardFrame 结构：圆角卡片内含表格 + border-t 分隔 footer）
 * - 可排序列（表头按钮，键盘可达，aria-sort）
 * - 可选行选择列（checkbox + 表头全选/半选）+ 选中悬浮操作胶囊（对齐 DataList SelectionBar）
 * - 双模式分页：客户端（内置分页模型）/ 受控 manual（服务端分页，翻页回调）
 *
 * 排序始终为客户端排序（当前数据内）；manual 分页模式下即"当前页内排序"，
 * 需要服务端排序的调用方请在数据层处理后再传入。
 */
import { useRef, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"

export type { ColumnDef }

/** 受控（服务端）分页：page 为 1-based，total 为服务端总数 */
export interface DataTableManualPagination {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[]
  data: T[]
  getRowId?: (row: T, index: number) => string
  /** 行点击（整行可点，自动 cursor-pointer；点击选择框不触发） */
  onRowClick?: (row: T) => void
  /** 启用行选择列（checkbox），受控：选中 id 列表 + 回调 */
  enableSelection?: boolean
  selectedIds?: string[]
  onSelectedIdsChange?: (ids: string[]) => void
  /** 选中悬浮胶囊内的批量操作（对齐 DataList.selectionActions；配合 ListActionButton 使用） */
  selectionActions?: (selectedRows: T[], clear: () => void) => ReactNode
  /** 受控排序（页面级 state 下发，如与「显示」菜单排序共用一个状态源）；不传则组件内部自管 */
  sorting?: SortingState
  /** 受控排序回调（与 sorting 成对出现）；不传则组件内部自管排序状态 */
  onSortingChange?: OnChangeFn<SortingState>
  /** 受控分页（服务端）；不传则客户端分页（默认 pageSize 20） */
  manualPagination?: DataTableManualPagination
  pageSize?: number
  /** 空态内容（默认 i18n 文案） */
  emptyContent?: ReactNode
  /** 表格外层附加类名 */
  className?: string
  /** 是否固定吸顶表头（默认 true） */
  stickyHeader?: boolean
  /** 滚动容器最大高度（内容独立滚动，表头稳固吸顶） */
  maxHeight?: string
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  onRowClick,
  enableSelection = false,
  selectedIds = [],
  onSelectedIdsChange,
  selectionActions,
  sorting,
  onSortingChange,
  manualPagination,
  pageSize = 20,
  emptyContent,
  className,
  stickyHeader = true,
  maxHeight,
}: DataTableProps<T>) {
  const { t } = useTranslation()
  const [internalSorting, setInternalSorting] = useState<SortingState>([])
  const [clientPage, setClientPage] = useState(1)

  // 排序受控环：外部传 onSortingChange 即为受控（sorting 可选，缺省视为未排序），
  // 否则回落内部状态——两种模式对表头渲染无差别
  const sortingManaged = onSortingChange !== undefined
  const effectiveSorting = sortingManaged ? (sorting ?? []) : internalSorting

  // 选择列受控：外部 string[] <-> tanstack RowSelectionState（受控环：
  // state 由 selectedIds 派生，内部 toggle 经 onRowSelectionChange 上报后由外部回流）
  const selectionManaged =
    enableSelection && onSelectedIdsChange !== undefined && getRowId !== undefined
  const derivedSelection: RowSelectionState = {}
  if (selectionManaged) {
    for (const id of selectedIds) derivedSelection[id] = true
  }

  const columnsWithSelector: ColumnDef<T, unknown>[] = enableSelection
    ? [
        {
          id: "__select",
          enableSorting: false,
          size: 36,
          header: ({ table }) =>
            selectionManaged ? (
              <Checkbox
                checked={
                  table.getIsAllPageRowsSelected() ||
                  table.getIsSomePageRowsSelected()
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="select all"
              />
            ) : null,
          cell: ({ row }) =>
            selectionManaged ? (
              <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                onClick={(e) => e.stopPropagation()}
                aria-label="select row"
              />
            ) : null,
        },
        ...columns,
      ]
    : columns

  const table = useReactTable({
    data,
    columns: columnsWithSelector,
    getRowId,
    state: {
      sorting: effectiveSorting,
      ...(selectionManaged ? { rowSelection: derivedSelection } : {}),
      ...(manualPagination
        ? { pagination: { pageIndex: manualPagination.page - 1, pageSize: manualPagination.pageSize } }
        : { pagination: { pageIndex: clientPage - 1, pageSize } }),
    },
    onSortingChange: sortingManaged ? onSortingChange : setInternalSorting,
    enableRowSelection: enableSelection,
    ...(selectionManaged
      ? {
          onRowSelectionChange: (updater) => {
            const next =
              typeof updater === "function"
                ? updater(derivedSelection)
                : updater
            onSelectedIdsChange!(
              Object.entries(next)
                .filter(([, v]) => v)
                .map(([k]) => k),
            )
          },
        }
      : {}),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // manual 模式不用客户端分页模型（数据已经是当前页）
    ...(manualPagination
      ? { manualPagination: true, pageCount: Math.max(1, Math.ceil(manualPagination.total / manualPagination.pageSize)) }
      : { getPaginationRowModel: getPaginationRowModel() }),
  })

  // 分页区间（manual：服务端 total；客户端：本地 filtered 行数）
  const total = manualPagination ? manualPagination.total : table.getFilteredRowModel().rows.length
  const currentPage = manualPagination ? manualPagination.page : clientPage
  const size = manualPagination ? manualPagination.pageSize : pageSize
  const from = total === 0 ? 0 : (currentPage - 1) * size + 1
  const to = Math.min(currentPage * size, total)
  const pageCount = Math.max(1, Math.ceil(total / size))

  const selectedRows = selectionManaged
    ? data.filter((row, index) => selectedIds.includes(getRowId(row, index)))
    : []

  const clearSelection = () => onSelectedIdsChange?.([])

  // 键盘行光标（宪法 §8.2：↑↓/j/k 移动、Enter 打开、x/space 选中、Escape 清除）
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [activeRowId, setActiveRowId] = useState<string | null>(null)
  const visibleRows = table.getRowModel().rows

  const moveActiveRow = (delta: number) => {
    if (visibleRows.length === 0) return
    const idx = visibleRows.findIndex((r) => r.id === activeRowId)
    const next =
      idx === -1
        ? delta > 0
          ? 0
          : visibleRows.length - 1
        : Math.min(visibleRows.length - 1, Math.max(0, idx + delta))
    const target = visibleRows[next]
    setActiveRowId(target.id)
    requestAnimationFrame(() => {
      const el = containerRef.current?.querySelector(`[data-row-id="${CSS.escape(target.id)}"]`)
      el?.scrollIntoView({ block: "nearest" })
    })
  }

  const toggleRowSelection = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((s) => s !== id)
      : [...selectedIds, id]
    onSelectedIdsChange?.(next)
  }

  // 键盘流只在表格容器自身聚焦时接管：焦点落在行内交互元素（checkbox/排序按钮/链接）
  // 时按键交还原生行为，避免 Enter/Space 双触发与 j/k 干扰，也不与命令面板/表单快捷键冲突。
  // base-ui Checkbox.Root 渲染为 span[role=checkbox]（非 button），需显式纳入
  const isInteractiveTarget = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (e.target === e.currentTarget) return false
    return !!(e.target as HTMLElement).closest(
      "button, a, input, textarea, select, [role=\"checkbox\"], [contenteditable=\"true\"]",
    )
  }

  const handleContainerFocus = () => {
    // 聚焦即激活首行（Tab 进入后直接可 Enter/x 操作，无需先按 j 探路）
    if (!activeRowId && visibleRows.length > 0) setActiveRowId(visibleRows[0].id)
  }

  const handleContainerClickCapture = (e: React.MouseEvent) => {
    if (isInteractiveTarget(e)) return
    // 先聚焦（触发 onFocus 激活首行），再覆盖为被点击的行——
    // 此前点击不可聚焦的 tr 会把焦点丢回 body，键盘流随之中断
    containerRef.current?.focus({ preventScroll: true })
    const rowEl = (e.target as HTMLElement).closest<HTMLElement>("[data-row-id]")
    if (rowEl?.dataset.rowId) setActiveRowId(rowEl.dataset.rowId)
  }

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (isInteractiveTarget(e)) return
    if (e.key === "ArrowDown" || e.key === "j") {
      e.preventDefault()
      moveActiveRow(1)
    } else if (e.key === "ArrowUp" || e.key === "k") {
      e.preventDefault()
      moveActiveRow(-1)
    } else if ((e.key === "x" || e.key === "X" || e.key === " ") && selectionManaged && activeRowId) {
      // x / space 切换当前行选中：走既有 enableSelection 受控契约（selectedIds/onSelectedIdsChange，
      // 悬浮胶囊与页面批量操作随选中状态联动）
      e.preventDefault()
      toggleRowSelection(activeRowId)
    } else if (e.key === "Enter" || (e.key === " " && !selectionManaged)) {
      if (activeRowId && onRowClick) {
        const row = visibleRows.find((r) => r.id === activeRowId)
        if (row) {
          e.preventDefault()
          onRowClick(row.original)
        }
      }
    } else if (e.key === "Escape") {
      clearSelection()
      setActiveRowId(null)
    }
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleListKeyDown}
      onFocus={handleContainerFocus}
      onClickCapture={handleContainerClickCapture}
      className={cn("space-y-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/40", className)}
      aria-label="Table. Use arrow keys or j/k to navigate, Enter to open, x or space to select, Escape to clear."
    >
      {/* 卡片式外壳（coss CardFrame 结构）：表格 + border-t 分隔 footer */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div
          className={cn(
            "w-full overflow-x-auto",
            maxHeight ? "overflow-y-auto" : "",
          )}
          style={maxHeight ? { maxHeight } : undefined}
        >
          <Table>
            <TableHeader
              className={cn(
                "bg-muted/40",
                stickyHeader && "sticky top-0 z-20 bg-card/95 backdrop-blur-xs border-b border-border shadow-2xs",
              )}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    const sorted = header.column.getIsSorted()
                    return (
                      <TableHead
                        key={header.id}
                        className={cn(stickyHeader && "sticky top-0 z-20 bg-inherit")}
                        style={header.getSize() !== 150 ? { width: header.getSize() } : undefined}
                        aria-sort={
                          sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined
                        }
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            className="group flex items-center gap-1 text-left font-medium outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-xs"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sorted === "asc" ? (
                              <ChevronUp className="size-3.5 shrink-0" />
                            ) : sorted === "desc" ? (
                              <ChevronDown className="size-3.5 shrink-0" />
                            ) : (
                              <ChevronsUpDown className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-50" />
                            )}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnsWithSelector.length} className="h-24 text-center">
                    {emptyContent ?? t("dataTable.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                visibleRows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-row-id={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className={cn(onRowClick && "cursor-pointer", activeRowId === row.id && "bg-accent")}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 卡片 footer：结果区间 + 翻页（coss CardFrameFooter 位） */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          <span>{t("dataTable.range", { from, to, total })}</span>
          <span className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="size-7 p-0"
              disabled={currentPage <= 1}
              onClick={() =>
                manualPagination
                  ? manualPagination.onPageChange(currentPage - 1)
                  : setClientPage((p) => Math.max(1, p - 1))
              }
              aria-label={t("dataTable.prev")}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="tabular-nums">
              {currentPage} / {pageCount}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="size-7 p-0"
              disabled={currentPage >= pageCount}
              onClick={() =>
                manualPagination
                  ? manualPagination.onPageChange(currentPage + 1)
                  : setClientPage((p) => p + 1)
              }
              aria-label={t("dataTable.next")}
            >
              <ChevronRight className="size-4" />
            </Button>
          </span>
        </div>
      </div>

      {/* 多选悬浮胶囊（对齐 DataList SelectionBar 形态） */}
      {selectionManaged && selectionActions && selectedRows.length > 0 && (
        <div className="pointer-events-none fixed bottom-28 left-1/2 z-50 -translate-x-1/2 transition-all duration-200">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-2 shadow-lg">
            <span className="px-2 text-sm font-semibold tabular-nums">
              {total > 0
                ? t("dataTable.selectedWithTotal", {
                    count: selectedRows.length,
                    total,
                  })
                : t("dataTable.selected", { count: selectedRows.length })}
            </span>
            <div className="flex items-center gap-1">
              {selectionActions(selectedRows, clearSelection)}
            </div>
            <button
              type="button"
              aria-label={t("common.close")}
              title={t("common.close")}
              onClick={clearSelection}
              className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
