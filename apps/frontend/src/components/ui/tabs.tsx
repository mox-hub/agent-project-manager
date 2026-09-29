import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    // base-ui 输出的是 data-orientation="horizontal|vertical"（无布尔 data-horizontal），
    // 方向选择器必须写 data-[orientation=…] 完整形态，裸写恒不匹配（左右布局事故根因）。
    // 默认（水平页签）上下堆叠：滑轨在内容块上方，w-fit 靠左上角对齐。
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex flex-col gap-2 data-[orientation=vertical]:flex-row",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-1 text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted/70 backdrop-blur-xs border border-border/50",
        // 项目扩展变体：胶囊滑块页签——轨道/滑块严格对齐 ui/segmented-control 规范
        // （border-border 实线、bg-background 实底无阴影、滑块 bg-muted/50、内容定宽不随容器拉伸）
        segmented:
          "relative gap-0 overflow-hidden rounded-full border border-border bg-background p-0.5 group-data-[orientation=horizontal]/tabs:h-8",
        // line：详情页 body 内的次级切换——下划线贴边六件套内聚为默认（F 类 J7/F5.1），
        // 消费面无需再手写 w-full/justify-start/border-b/p-0/h-auto
        line: "w-full justify-start gap-1 border-b bg-transparent p-0 group-data-[orientation=horizontal]/tabs:h-auto",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {variant === "segmented" && (
        <TabsPrimitive.Indicator
          data-slot="tabs-indicator"
          // 滑块不带 z-index（对齐 segmented-control：靠 DOM 序垫在触发器之下），bg-muted/50 + shadow-xs 为规范档
          className="pointer-events-none absolute rounded-full bg-muted/50 shadow-xs transition-[left,top,width,height] duration-slow ease-out left-[var(--active-tab-left)] top-[var(--active-tab-top)] w-[var(--active-tab-width)] h-[var(--active-tab-height)]"
        />
      )}
      {props.children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-xs group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        // segmented：内容定宽（不吃 flex-1 拉伸）+ 规范内边距；激活底色交由滑块承担，触发器保持透明
        "group-data-[variant=segmented]/tabs-list:px-3 group-data-[variant=segmented]/tabs-list:flex-none group-data-[variant=segmented]/tabs-list:data-active:bg-transparent dark:group-data-[variant=segmented]/tabs-list:data-active:bg-transparent",
        "data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
