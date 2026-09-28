import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Label 的字阶/色调档（E 类桶1 增补，2026-09-28）：纯增补，default 档不生成
 * 任何类 ⇒ 既有调用方渲染逐字节不变。归因：
 * · variant=muted：承接「弱化标签」（生产面裸写 text-muted-foreground 覆盖）；
 * · fontSize=sm：基线字号的显式还原档（同 ui/button fontSize 轴 sm 档先例）——
 *   实例裸写 text-sm 会经 twMerge 吞掉基线 leading-none，删除实例类会恢复
 *   leading 而改变渲染，故必须立「还原档」承接而不能冗余删除；
 * 字号 xs：先例未达立档门槛（有先例再扩，先例多时照 ui/field.tsx 的
 * FieldLabel size 轴口径补）。
 */
type LabelVariant = "default" | "muted"
type LabelFontSize = "default" | "sm"

function Label({
  className,
  variant = "default",
  fontSize = "default",
  ...props
}: React.ComponentProps<"label"> & {
  variant?: LabelVariant
  fontSize?: LabelFontSize
}) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        fontSize === "sm" && "text-sm",
        variant === "muted" && "text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Label }
