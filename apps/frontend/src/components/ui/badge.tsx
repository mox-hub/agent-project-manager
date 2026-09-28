import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-chip border border-transparent px-2 py-0.5 text-2xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      // —— E 类桶1 增补（2026-09-28）：字阶轴，纯增补，default 档为空串 ⇒
      // 既有全部 variant 档输出逐字节不变。归因：生产面 Badge 上的 className
      // 字号覆盖大量集中在 `text-3xs`（徽标内数字/紧凑计数，§2.4 允许徽标内
      // 数字用 3xs）与 `text-xs`，此前只能由调用方写 className 覆盖表达。
      // `text-sm` 有先例但未达立档门槛，暂不立（有先例再扩）。
      fontSize: {
        default: "",
        "3xs": "text-3xs",
        xs: "text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      fontSize: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  // fontSize 是只给 cva 用的轴，必须在此解构（否则透传 DOM）。
  fontSize = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, fontSize }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
