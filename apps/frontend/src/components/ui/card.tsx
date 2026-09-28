import * as React from "react"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  variant = "default",
  border = "ring",
  surface = "default",
  inset = "default",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm"
  variant?: "default" | "outline"
  border?: "ring" | "solid" | "dashed"
  surface?: "default" | "flat" | "translucent"
  inset?: "default" | "xs" | "sm" | "md" | "lg" | "xl"
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      data-border={border}
      data-surface={surface}
      data-inset={inset}
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
        // —— E 类批 0b 增补：Card 内距轴 `inset`，纯增补，`default` 不生成任何类 ——
        //
        // 形态依据（口径：`components/ui/` 之外、排除 `*.test.*` / `*.stories.*` 的生产面里，
        // 同一 class 串内「圆角档 + 卡片底色」且未 import `ui/card` 的手写壳）：这类壳是**裸壳**
        // ——内容直接挂在壳根上，没有 header/content 槽位拆分，内距类因此落在**壳根元素**上。
        // 故本轴只接管**根元素内距**，不覆盖 `--card-spacing`：槽位级内距在仓内实测无该类先例，
        // 按「无证据不造档」不立；`size` 已给槽位内距两档，两轴**按形态分工、不叠加**：
        //   · 裸壳形态：内距由本轴给（`p-*`），内容直接作为 children；
        //   · 槽位形态：内距由 `size` 经 `--card-spacing` 给，走 CardHeader / Content / Footer；
        //     两形态同用会「根内距 + 槽位内距」叠加，属禁止组合。
        // 档位值域 = 裸壳实测的**对称内距**取值（写成 `px-N py-N` 的等值形式按同一内距归并到该档）；
        // 档名沿用 `COMPONENTS.md` 的尺寸词表，其中 `md` 与 Card 基线 `--card-spacing(4)` 同值、
        // `sm` 与 `size=sm` 的槽位间距同值——本轴不是另起的一套刻度，而是既有内距阶梯的显式化。
        // 两个 `.5` 档与相邻主档仅差一档（2px）、且属零散取值，**不立档**（否则本轴出现相邻不可辨档）。
        // 与 `size` 同时给出时的裁决（已按构建产物取证）：垂直以 `size` 档为准——`data-[size=*]:py-*`
        // 作用域类特异性高于裸 `p-*`；水平以本轴为准。
        //
        // 轴名（2026-09-28 裁决，跨组件口径）：本轴叫 `inset`——**语义档 + 一维全向**
        // （`p-N`，档名 xs/sm/md/lg/xl）。`ui/button.tsx` 另有一根内距轴，但那是**二维内距对**
        // （`px-* py-*`），语义档名会给「同横不同纵」的形态编出撒谎的名字，故那边档名即类值
        // 且**必须异名**（叫 `padding`）。通则：**同名轴若值域形态不同必须异名**。
        inset === "xs" && "p-2",
        inset === "sm" && "p-3",
        inset === "md" && "p-4",
        inset === "lg" && "p-6",
        inset === "xl" && "p-8",
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

/**
 * CardTitle 的字阶/字重档（E 类桶1 增补，2026-09-28）：纯增补，default 档
 * 不生成任何类 ⇒ 既有渲染逐字节不变。归因：生产面裸覆盖集中在
 * `text-sm`（小一号标题，与 size=sm 卡片同值但作用于普通卡）、`text-base`
 * （基线字号的显式还原——同 ui/button fontSize 轴的 sm 档先例：实例裸写
 * text-base 会经 twMerge 吞掉基线 leading-normal，删除实例类会**恢复**
 * leading 而改变渲染，故必须立「还原档」承接而不能冗余删除）与
 * `font-medium`（降半档字重，与基线同组覆盖，删除安全——但先例未达
 * 立档门槛前按字阶轴同款口径一并立出，便于统一迁移）。
 */
type CardTitleSize = "default" | "sm" | "base"
type CardTitleFontWeight = "default" | "medium"

function CardTitle({
  className,
  size = "default",
  fontWeight = "default",
  ...props
}: React.ComponentProps<"div"> & {
  size?: CardTitleSize
  fontWeight?: CardTitleFontWeight
}) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-base leading-normal font-semibold group-data-[size=sm]/card:text-sm",
        size === "sm" && "text-sm",
        size === "base" && "text-base",
        fontWeight === "medium" && "font-medium",
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

/**
 * CardContent 的内距档（E 类桶1 增补，2026-09-28）：纯增补，default 档不生成
 * 任何类 ⇒ 既有渲染逐字节不变。归因：生产面裸覆盖集中在 `p-4`（与基线
 * px-(--card-spacing) 在 size=default 卡下同值的**全向**内距）与 `p-0`（撤内距）。
 * 档名沿用根组件 `inset` 轴的语义词表（none=p-0、md=p-4）；其余档（xs/sm/lg/xl）
 * 实测先例未达立档门槛，有先例再扩。与根轴同名的的原因：同一语义刻度、
 * 同一值域形态（一维全向 p-N）。
 */
type CardContentInset = "default" | "none" | "md"

function CardContent({
  className,
  inset = "default",
  ...props
}: React.ComponentProps<"div"> & { inset?: CardContentInset }) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "flex flex-col gap-3 px-(--card-spacing)",
        inset === "none" && "p-0",
        inset === "md" && "p-4",
        className
      )}
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
