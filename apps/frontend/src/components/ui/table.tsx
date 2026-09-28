"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({
  className,
  fontSize = "default",
  variant = "default",
  ...props
}: React.ComponentProps<"thead"> & {
  /** 字阶/色调档（E 类桶1 增补 2026-09-28，纯增补 default 不变）：紧凑表头的
   * `text-xs` 与弱色 `text-muted-foreground` 此前只能由调用方 className 表达。 */
  fontSize?: "default" | "xs"
  variant?: "default" | "muted"
}) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "[&_tr]:border-b",
        fontSize === "xs" && "text-xs",
        variant === "muted" && "text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

// —— E 类桶1 增补（2026-09-28）：表头/单元格的对齐·内距·字阶档 ——
// 全部「默认不变」：default 档不生成任何类 ⇒ 既有渲染逐字节不变（纯增补）。
// 归因（生产面裸覆盖形态聚类）：
// · align：`text-right` / `text-center` 是数字/操作列的正当排版语义，此前只能
//   由调用方写 text-* 覆盖（TableHead 基线 text-left，TableCell 不设对齐靠继承）；
// · padding：紧凑行内距（`py-1` / `py-1.5`）与表头全向紧凑（`p-2`）——档名即类值
//   （同 ui/button padding 轴先例，一维覆盖不造语义名）；
// · fontSize：单元格 `text-xs`（紧凑表），基线不设字号（继承 Table 的 text-sm）。
type TableCellAlign = "default" | "right" | "center"
type TableCellPadding = "default" | "py-1" | "py-1.5"
type TableCellFontSize = "default" | "xs"
type TableHeadAlign = TableCellAlign
type TableHeadPadding = "default" | "p-2"

// —— E 类第二轮增补（2026-09-28 第八轮裁决 #1-②）：dense 紧凑行档 + TableHead 列宽档 ——
// 归因出处：`docs/design/修改方案-E类-2026-09-27.md` §七之九 #1；逐值取自清剿报告
// `docs/design/清剿报告-E类四桶-2026-09-28.md`（④-4 / ⑤ 留报）：
// · TableCell dense = `py-1.5`：紧凑行高频形态（role/status/release 面板 15+ 处留报）；
//   与既有 padding="py-1.5" 档产出同一类，dense 是「整表紧凑行」的语义档名（见下）。
// · TableHead dense = `py-1`：表头紧凑实测形态（生产 `<TableHead className="py-1">`）。
//   表头定高 h-10 在基线不变，故 dense 只表达纵内距档——与调用方裸写完全同构。
// · width：表头列宽（w-8…w-40）是清剿报告点名的「列宽槽位」缺档（w-* 196 条里的
//   表头簇），档名即类值（同 button padding / input size 轴先例）。值域=实测封闭词表。
//   命名用 `width`：CSS 属性同词、无歧义；原生 th 的 width 属性已 Omit 让位。
// 与 padding 轴的关系：dense 是「紧凑行」的**语义快捷档**（一次表达行密度意图），
// padding 是**值档**（逐类精确表达）；二者同给时按 cn 顺序 className 侧最终覆盖，
// 混用不属本档设计意图（评审把关）。
type TableCellDensity = "default" | "dense"
type TableHeadDensity = "default" | "dense"
type TableHeadWidth =
  | "default"
  | "w-8"
  | "w-10"
  | "w-12"
  | "w-16"
  | "w-20"
  | "w-24"
  | "w-28"
  | "w-32"
  | "w-36"
  | "w-40"

function TableHead({
  className,
  align = "default",
  padding = "default",
  density = "default",
  width = "default",
  ...props
}: Omit<React.ComponentProps<"th">, "align" | "width"> & {
  align?: TableHeadAlign
  padding?: TableHeadPadding
  density?: TableHeadDensity
  width?: TableHeadWidth
}) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        align === "right" && "text-right",
        align === "center" && "text-center",
        padding !== "default" && padding,
        density === "dense" && "py-1",
        width !== "default" && width,
        className
      )}
      {...props}
    />
  )
}

function TableCell({
  className,
  align = "default",
  padding = "default",
  density = "default",
  fontSize = "default",
  ...props
}: Omit<React.ComponentProps<"td">, "align"> & {
  align?: TableCellAlign
  padding?: TableCellPadding
  density?: TableCellDensity
  fontSize?: TableCellFontSize
}) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        align === "right" && "text-right",
        align === "center" && "text-center",
        padding !== "default" && padding,
        density === "dense" && "py-1.5",
        fontSize === "xs" && "text-xs",
        className
      )}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
