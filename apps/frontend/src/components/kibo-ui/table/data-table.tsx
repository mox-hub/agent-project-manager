"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  pageSize?: number;
  pageIndex?: number;
  onPageChange?: (pageIndex: number, pageSize: number) => void;
  onRowClick?: (row: TData) => void;
  sortable?: boolean;
  filterable?: boolean;
  className?: string;
}

export function DataTable<TData>({
  columns,
  data,
  pageSize: initialPageSize = 10,
  pageIndex: initialPageIndex = 0,
  onPageChange,
  onRowClick,
  sortable = true,
  filterable = true,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: initialPageIndex,
    pageSize: initialPageSize,
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: sortable ? getSortedRowModel() : undefined,
    getFilteredRowModel: filterable ? getFilteredRowModel() : undefined,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
  });

  const handlePageChange = (newPageIndex: number, newPageSize: number) => {
    const newState = { ...pagination, pageIndex: newPageIndex, pageSize: newPageSize };
    setPagination(newState);
    onPageChange?.(newPageIndex, newPageSize);
  };

  const pageCount = table.getPageCount();
  const currentPage = pagination.pageIndex + 1;

  const pageNumbers: Array<number | "ellipsis"> = React.useMemo(() => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }
    const pages: Array<number | "ellipsis"> = [1];
    if (currentPage > 3) pages.push("ellipsis");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(pageCount - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (currentPage < pageCount - 2) pages.push("ellipsis");
    pages.push(pageCount);
    return pages;
  }, [currentPage, pageCount]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Table */}
      <div className="rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <Table>
          <TableHeader className="[&_tr]:border-b [&_tr]:border-zinc-200 dark:[&_tr]:border-zinc-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-zinc-200 dark:border-zinc-800 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50 data-[state=selected]:bg-zinc-50 dark:data-[state=selected]:bg-zinc-900">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "h-10 px-4 text-left align-middle font-medium text-zinc-500 dark:text-zinc-400",
                        header.column.getCanSort() && "cursor-pointer select-none"
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {sortable && header.column.getCanSort() && (
                        <span className="ml-2 inline-flex">
                          {{
                            asc: <ChevronUp className="h-3 w-3" />,
                            desc: <ChevronDown className="h-3 w-3" />,
                          }[header.column.getIsSorted() as string] ?? (
                            <ChevronsUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </span>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="[&_tr:last-child]:border-0">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    "border-b border-zinc-200 dark:border-zinc-800 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="p-4 align-middle"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-zinc-500">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (!table.getCanPreviousPage()) return;
                  handlePageChange(pagination.pageIndex - 1, pagination.pageSize);
                }}
                className={!table.getCanPreviousPage() ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {pageNumbers.map((page, index) =>
              page === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    isActive={currentPage === page}
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(page - 1, pagination.pageSize);
                    }}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (!table.getCanNextPage()) return;
                  handlePageChange(pagination.pageIndex + 1, pagination.pageSize);
                }}
                className={!table.getCanNextPage() ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
