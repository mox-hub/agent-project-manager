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
      // —— E 类第二轮增补（2026-09-28 第八轮裁决 #1-⑥）：accent 色轴 ——
      // 裁决原文：accent-* → 语义色档，**逐值同源**（不引入新色）。出处：
      // `docs/design/修改方案-E类-2026-09-27.md` §七之九 #1。
      // 归因（生产面 Badge 的 accent-* 覆盖实测，两类配对）：
      // · 弱底配对（主流）：`bg-accent-{c}/10 text-accent-{c}` —— models-tab、
      //   prompts-section、route-preview 等多处；
      // · 实底配对（裁决点名）：`bg-accent-{c} hover:bg-accent-{c}` —— github-panel
      //   PR 状态徽标（裁决 #1-⑥ 点名的取证行）。
      // 色域只收 Badge 级实测有量级的 green / blue / purple 三色：yellow / orange 的
      // Badge 形态都带 border-* 与 /15 一类个性化组合，不是「同值类组合」，不硬塞
      // （沿用批 0 的「不硬塞」清单纪律）；red 未在 Badge 上出现，不造档。
      // 命名：轴名与档名**避开状态语境词表**（§七之八（四）spinner `tone`→`color`
      // 正名先例——no-adhoc-tone 规则对 ui/ 原子层同样生效，语境词表含 tone/status），
      // 用 CSS color 语义的 `color` + 色相词；`-solid` 后缀区分实底配对与弱底配对。
      // ⚠️ 与 tone.ts 五档状态词表的关系：本轴是**分类/装饰强调**色，不是状态 tone
      // （purple 不入 tone 词表的既有裁决 §七之四 3-3 同口径）。
      // 默认档为空串 ⇒ 既有全部 variant × fontSize 档输出逐字节不变（纯增补）。
      color: {
        default: "",
        green: "bg-accent-green/10 text-accent-green",
        blue: "bg-accent-blue/10 text-accent-blue",
        purple: "bg-accent-purple/10 text-accent-purple",
        "green-solid": "bg-accent-green hover:bg-accent-green",
        "purple-solid": "bg-accent-purple hover:bg-accent-purple",
      },
    },
    defaultVariants: {
      variant: "default",
      fontSize: "default",
      color: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  // fontSize / color 是只给 cva 用的轴，必须在此解构（否则透传 DOM 属性）。
  fontSize = "default",
  color = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, fontSize, color }), className),
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
