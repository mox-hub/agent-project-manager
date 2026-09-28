import { cn } from "@/lib/utils"
import { Loader2Icon } from "lucide-react"

/**
 * SpinnerSize（E 类桶1 增补 2026-09-28，纯增补不改既有档值）：
 * 新增 `xs`（size-3.5）/ `2xs`（size-3）两档，命名沿用 button 字阶约定
 * （`2<档>` = 该档的下一档）：sm(16px) 的下一档是 xs(14px)，再下一档 2xs(12px)。
 * 归因：生产面 Spinner 上的 className 尺寸覆盖集中在 size-3 / size-3.5，
 * 此前只能由调用方写 className 覆盖表达；sm 及以上档位不变。
 */
export type SpinnerSize = "2xs" | "xs" | "sm" | "md" | "lg" | "xl"

/**
 * SpinnerColor（E 类桶1 增补 2026-09-28）：`inherit` 承接「跟随所在文字颜色」
 * 的形态（调用方裸写 text-inherit 覆盖基线弱色）。default 档输出与原基线
 * 逐字节一致（text-muted-foreground），既有调用方渲染不变。
 * 刻意只设 inherit：其余状态色调归 `ui/tone.ts` 五档词表管辖，不在此私造。
 * 命名用 `color`（CSS color 语义）而非 `tone`：§19.5 的 tone 是状态语义
 * 五档词表（default/info/warning/success/danger），本轴只是前景色跟随档，
 * 不是状态 tone，避免误入状态色链路。
 */
export type SpinnerColor = "default" | "inherit"

export interface SpinnerProps extends React.ComponentProps<"svg"> {
  size?: SpinnerSize
  color?: SpinnerColor
  label?: string
}

const sizeMap: Record<SpinnerSize, string> = {
  "2xs": "size-3",
  xs: "size-3.5",
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
  xl: "size-8",
}

const colorMap: Record<SpinnerColor, string> = {
  default: "text-muted-foreground",
  inherit: "text-inherit",
}

function Spinner({
  size = "md",
  color = "default",
  label,
  className,
  ...props
}: SpinnerProps) {
  return (
    <Loader2Icon
      role="status"
      aria-label={label ?? "加载中"}
      className={cn(sizeMap[size], "animate-spin", colorMap[color], className)}
      {...props}
    />
  )
}

export { Spinner }
