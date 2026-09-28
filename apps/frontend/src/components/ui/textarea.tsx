import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * 字族档（E 类第二轮增补，2026-09-28 第八轮裁决 #1-①，纯增补 default 不变）：
 * `mono` 输出 `font-mono`。归因与命名理由同 `ui/input.tsx` 的 `fontVariant` 注释
 * （桶3 font-mono 留报 32 处、表单控件无内层可下沉；裁决出处 §七之九 #1）。
 * 刻意不设 fontSize 轴：生产面 Textarea 无字号覆盖实测先例（「无证据不造档」，
 * 与 Input 的 fontSize 轴不同——后者是桶1 按实测补的）。
 */
function Textarea({
  className,
  fontVariant = "default",
  ...props
}: React.ComponentProps<"textarea"> & {
  fontVariant?: "default" | "mono"
}) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        fontVariant === "mono" && "font-mono",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
