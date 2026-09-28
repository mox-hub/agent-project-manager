import * as React from "react"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  variant = "default",
  border = "ring",
  surface = "default",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm"
  variant?: "default" | "outline"
  border?: "ring" | "solid" | "dashed"
  surface?: "default" | "flat" | "translucent"
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      data-border={border}
      data-surface={surface}
      className={cn(
        "group/card flex flex-col gap-3 overflow-hidden rounded-xl bg-card py-3.5 text-sm text-card-foreground shadow-xs ring-1 ring-border/50 [--card-spacing:--spacing(4)] has-[>img:first-child]:pt-0 data-[size=sm]:py-2.5 data-[size=sm]:gap-2 data-[size=sm]:[--card-spacing:--spacing(3)] *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        // —— E 类批 0 增补（2026-09-27）：纯增补，variant=default 时下面整行不生效 ——
        // 归纳自手写卡片壳的形态聚类（口径：同一 class 串内「圆角档 + bg-card」且未
        // import ui/card）。主形态 = 「描边 + 无投影 + rounded-lg」——正是 §4.5
        // 「卡片/面板 = rounded-lg」那一档；手写壳以 border 描边为主（几乎不用 ring），
        // 多数无 shadow。**本注释刻意不写逐类「N 行 / M 文件」先例数**（2026-09-28
        // 裁决「删数留结论」）：同型计数在不同口径下不可复现——本仓实测同一靶子出现过
        // 「39 行」与「40 行」两种结果，写进源码即变成无法核对的噪声。
        // 故 outline 一次给出「描边 + 去投影 + 卡片圆角」三件事；default 保留
        // rounded-xl + ring-1 + shadow-xs 不动，既有 55 个消费方渲染不变（已复算：55）。
        // 置于 className 之前，保留调用方的最终覆盖权。
        variant === "outline" &&
          "rounded-lg border border-border ring-0 shadow-none",
        // —— E 类批 0b 增补：Card 第二·三轴，纯增补，默认值不生成任何类 ——
        //
        // 第二轴 `border`（描边样式）：Card 基线用「环」描边，与 `variant="outline"`
        // 的「实线」描边被焊在同一根 `variant` 轴上，导致「要基线的圆角档 + 要实线描边」
        // 无档可用——手写卡片壳里这一类正是靠 className 传 `border` 绕过的（违反
        // §19.4 的 className 白名单）。抽出描边样式轴后，`variant="default"` 不再被
        // 强制成环，`variant` 只管圆角与表面语义。形态分布与逐行依据见
        // `docs/design/修改方案-E类-2026-09-27.md`（批 0「未入档清单」与批 7 开工条件）。
        border === "solid" && "border border-border ring-0",
        border === "dashed" && "border border-dashed border-border ring-0",
        // 第三轴 `surface`（表面/强调层级）：实测「无投影 / 有投影」是壳的强调度主轴，
        // 而它同样被焊进了 `variant`（default 带投影、outline 去投影）。半透明弱化壳
        // （更低一档的强调）此前同样无档可用。
        // `flat` = 去投影（§3.6 的复位档 `shadow-none`），层级交给描边；
        // `translucent` = 弱化壳：半透明底 + 半色描边 + 去投影。色名一律取自
        // `index.css` 已注册的语义 token，未新增 token。
        surface === "flat" && "shadow-none",
        surface === "translucent" &&
          "border border-border/60 bg-card/60 ring-0 shadow-none",
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
