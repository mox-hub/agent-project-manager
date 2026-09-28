import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background shadow-xs hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        // 项目扩展变体（历史保留）
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // —— E 类批 0 增补（2026-09-27）：纯增补，不改任何既有档位的类值 ——
        // 来源：生产裸 <button>（`components/ui/` 之外）className 的**形态聚类 + 档位语义**。
        // 靶子规模与口径见 `docs/design/修改方案-E类-2026-09-27.md`（正则行级 315 处 /
        // 元素级真值 314 处，差 1 处为 JSX 注释误命中）。**本注释刻意不写逐档先例数**：
        // 2026-09-28 裁决「删数留结论」——逐档计数在不同口径下不可复现（含/不含
        // `components/ui/`、元素级 vs 行级），写进源码即变成无法核对的噪声。分界口径：
        // · quiet：文字色变化，**无 hover 底色**（批 6 实测的最大缺口）
        // · subtle：文字色变化 + **弱底色**；
        //   与 ghost 的唯一差别是「基色为内容弱色」——ghost 不设基色，靠继承，
        //   因此需要弱色基色的调用方此前只能写 className 覆盖。
        //   hover 底用 bg-muted（bg-accent 与 bg-muted 是同一 token 值，见报告）。
        // · ghost-danger：静默态 + 悬停/聚焦才转危险色；
        //   与既有 destructive 的区别是 **无基色底**，故不与 destructive 重复。
        quiet: "text-muted-foreground hover:text-foreground",
        subtle: "text-muted-foreground hover:bg-muted hover:text-foreground",
        "ghost-danger":
          "text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
      },
      size: {
        default:
          "h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),8px)] px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
        lg: "h-10 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-9",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),8px)] in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-md",
        "icon-lg": "size-10",
        // —— E 类批 0 增补（2026-09-27）：纯增补，不改任何既有档位的类值 ——
        // 档名规则：`2<档>` = 该档的下一档，沿用字阶 3xs / 2xs 的既有命名约定
        // （`2xs` 即「xs 的下一档」）。
        // · icon-2xs = 20px：既有最小档 icon-xs 是 24px，此前 20px 只能写裸 <button>
        // · icon-2sm = 28px：落在 xs(24px) 与 sm(32px) 之间的空档
        // 圆角刻意不写：基线已是 rounded-md（§4.5「按钮一律 rounded-md，不因尺寸降档」），
        // 与 icon / icon-lg 同口径；既有 xs/icon-xs/icon-sm 的 min() 钳位是历史存量，未改动。
        "icon-2xs": "size-5",
        "icon-2sm": "size-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// 组合方式：唯一走 base-ui 原生 `render` prop（宪法 §10.7）。
// Radix 遗产 `asChild` 已于批 6b 移除（radix 已退场，base-ui 不认该 prop）。
// 用 `render` 换成 <a>/<Link> 等非 button 元素时，**必须**由调用方显式传
// `nativeButton={false}`——不是可选优化。实测不传时渲染出的是 `<a type="button" href>`
// 且 role 为空：语义错乱，读屏与测试都无法识别为链接。
// 既有正确用法见 components/ui/pagination.tsx 的 PaginationLink。
function Button({
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
