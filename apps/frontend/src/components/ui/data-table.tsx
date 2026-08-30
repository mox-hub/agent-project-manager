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
  /** 受控分页（服务端）；不传则客户端分页（默认 pageSize 20） */
  manualPagination?: DataTableManualPagination
  pageSize?: number
  /** 空态内容（默认 i18n 文案） */
  emptyContent?: ReactNode
  /** 表格外层附加类名 */
  className?: string
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
  manualPagination,
  pageSize = 20,
  emptyContent,
  className,
}: DataTableProps<T>) {
  const { t } = useTranslation()
  const [sorting, setSorting] = useState<SortingState>([])
  const [clientPage, setClientPage] = useState(1)

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
      sorting,
      ...(selectionManaged ? { rowSelection: derivedSelection } : {}),
      ...(manualPagination
        ? { pagination: { pageIndex: manualPagination.page - 1, pageSize: manualPagination.pageSize } }
        : { pagination: { pageIndex: clientPage - 1, pageSize } }),
    },
    onSortingChange: setSorting,
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

  // 键盘行光标（宪法 §8.2：↑↓/j/k 移动、Enter 打开、Escape 清除选择）
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

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "j") {
      e.preventDefault()
      moveActiveRow(1)
    } else if (e.key === "ArrowUp" || e.key === "k") {
      e.preventDefault()
      moveActiveRow(-1)
    } else if ((e.key === "Enter" || e.key === " ") && activeRowId && onRowClick) {
      const row = visibleRows.find((r) => r.id === activeRowId)
      if (row) {
        e.preventDefault()
        onRowClick(row.original)
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
      className={cn("space-y-2 outline-none", className)}
      aria-label="Table. Use arrow keys to navigate, Enter to open."
    >
      {/* 卡片式外壳（coss CardFrame 结构）：表格 + border-t 分隔 footer */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    const sorted = header.column.getIsSorted()
                    return (
                      <TableHead
                        key={header.id}
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
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-2 shadow-lg">
            <span className="px-2 text-sm font-semibold tabular-nums">
              {t("dataTable.selected", { count: selectedRows.length })}
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
