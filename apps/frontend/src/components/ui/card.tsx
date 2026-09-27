import * as React from "react"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm"
  variant?: "default" | "outline"
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      className={cn(
        "group/card flex flex-col gap-3 overflow-hidden rounded-xl bg-card py-3.5 text-sm text-card-foreground shadow-xs ring-1 ring-border/50 [--card-spacing:--spacing(4)] has-[>img:first-child]:pt-0 data-[size=sm]:py-2.5 data-[size=sm]:gap-2 data-[size=sm]:[--card-spacing:--spacing(3)] *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        // —— E 类批 0 增补（2026-09-27）：纯增补，variant=default 时下面整行不生效 ——
        // 归纳自 27 个文件 / 40 行手写卡片壳（口径：同一 class 串内「圆角档 + bg-card」
        // 且未 import ui/card）。主形态 = 「描边 + 无投影 + rounded-lg」23 行 / 16 文件：
        // 手写壳 40/40 用 border 描边（0/40 用 ring），30/40 无 shadow，
        // 26/40 用 rounded-lg——正是 §4.5「卡片/面板 = rounded-lg」那一档。
        // 故 outline 一次给出「描边 + 去投影 + 卡片圆角」三件事；default 保留
        // rounded-xl + ring-1 + shadow-xs 不动，既有 55 个消费方渲染不变。
        // 置于 className 之前，保留调用方的最终覆盖权。
        variant === "outline" &&
          "rounded-lg border border-border ring-0 shadow-none",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-base leading-normal font-semibold group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("flex flex-col gap-3 px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl px-(--card-spacing) [.border-t]:pt-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
