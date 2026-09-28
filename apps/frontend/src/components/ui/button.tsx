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
      // —— E 类批 0b 增补（2026-09-28）：语义色 tone 轴 ——
      // 立项与靶子口径见 `docs/design/修改方案-E类-2026-09-27.md`（§七之二 #1「批 0b 能力
      // 二次补档」）。**本注释刻意不写逐档先例数**（2026-09-28 裁决「删数留结论」）。
      //
      // 值域只收「生产裸 <button> 实测有量级证据、且已被 E 类方案 §19.4/§19.5 点名」的语义档：
      //   · info   = 信息/中性动作（accent-blue）
      //   · danger = 危险/破坏性动作（accent-red）
      // 刻意**不设** success / warning（实测零先例 ⇒ 依「无证据不造档」不立档），
      // 也刻意**不设** accent-purple（实测确有量级，但紫不在 tone 词表内，属词表扩容，
      // 已上呈人裁）。要补成功/警告档时，须先有先例，再按下方同名规则追加。
      //
      // 为何写成 `data-[tone=…]:` 作用域而不是裸色类：Tailwind 同一 utility 的胜出由
      // **样式表内规则先后**决定，不由 className 书写顺序决定；本仓构建产物实测
      // `text-muted-foreground` 排在所有 accent 色之后 ⇒ 若 tone 与任何设色的 variant
      // （quiet / ghost / destructive …）并存，裸色类会被静默吞掉。加一档 `data-tone`
      // 属性把选择器特异性从 (0,1,0) 提到 (0,2,0)（hover 态 (0,3,0)）即可稳压，
      // 与 size 档既有的 `in-data-[slot=button-group]:` 是同一手法。
      //
      // ⚠️ 连带契约：这组类**离开 `data-tone` 属性即为死类**（写了不生效，同幽灵类）。
      // 属性由下方 `Button` 组件统一挂载，已有测试守卫「非默认档必带属性 / 默认档必不带」。
      // 后续若把这些类改由 `components/ui/tone.ts` 供给，**必须连同 data 作用域一起搬**，
      // 否则 tone 会无声失效（§19.5 的 tone 下沉改造请注意此点）。
      tone: {
        default: "",
        info: "data-[tone=info]:text-accent-blue data-[tone=info]:hover:text-accent-blue data-[tone=info]:hover:bg-accent-blue-light",
        danger:
          "data-[tone=danger]:text-accent-red data-[tone=danger]:hover:text-accent-red data-[tone=danger]:hover:bg-accent-red-light",
      },
      // —— E 类批 0b 二次补档（2026-09-28）：内距轴 ——
      // 立项与靶子口径见 `docs/design/修改方案-E类-2026-09-27.md`（§七之二 #1「批 0b 能力
      // 二次补档」与「批 6 开工前可行性复核」③ 的缺档分布）。口径：生产裸 `<button>`
      // （`src/components/ui/**` 之外，排除 `*.test.*` / `*.stories.*`）className 的
      // **形态聚类 + 档位语义**。**本注释刻意不写逐档先例数**（2026-09-28 裁决「删数留结论」）：
      // 同型计数在不同口径下不可复现，写进源码即成为无法核对的噪声。
      //
      // 为什么档值是「内距原样写出」而不是 xs/sm/lg 一类的阶梯名：实测的 `px-*/py-*`
      // 组合是**二维**的（横内距与纵内距各自独立取档），不存在单一阶梯能覆盖——硬造
      // 阶梯名就会给「px-2 py-1.5」与「px-2 py-0.5」这类同横不同纵的形态编出无语义的
      // 名字。故档值直接等于它产出的内距类串：**档位表即实测簇的封闭词表**，表外的
      // 组合（如 `px-5 py-4`）在类型上不可表达。每个档一一对应实测形态聚类：
      //   · `p-0.5` / `p-1` / `p-1.5` —— 方形内距（四周等值）：图标钮 / 紧凑方钮，
      //     与 `size="icon-*"` 同族但走「内距撑高」模型（见下），多以 `opacity-0`
      //     悬停显形、出现在行尾或面板角；
      //   · `px-1.5 py-0.5` / `px-2 py-0.5` / `px-2 py-1` / `px-2.5 py-1` 一族 ——
      //     密集工具条钮 / chip（常配 `rounded-sm`、`font-mono`、`text-2xs`，
      //     纵内距明显小于横内距）；
      //   · `px-2 py-1.5` / `px-2.5 py-1.5` / `px-3 py-1.5` 一族 —— 列表行钮 / 面板内
      //     动作钮（常配 `w-full` + `text-left` + `hover:bg-accent`）；
      //   · `px-2.5 py-2` / `px-3 py-2` / `px-3 py-2.5` 一族 —— 对话框内选项钮 /
      //     卡片式钮（`items-start` + 两行文案）。
      //
      // ⚠️ **本轴会接管高度**（每档都带 `h-auto`）——这是它「可用」的前提，不是顺手加
      // 的：实测缺档的裸钮**多数不写 `h-*`，靠内距撑高**，其真实高度落在 20/22/26/28px
      // 等位置，而 `size` 轴只提供 h-6(24) / h-8(32) / h-9(36) / h-10(40)——若本轴只给
      // `px/py` 不动高度，`size` 的定高会留下，档位就落不到目标几何（迁移即产生可见
      // 变化，违反批 6 的「无损」前提 ⇒ 造出「禁了但没得用」的档）。故约定：
      // **`size` = 定高模型（档位定 h-* 与横内距）；`padding` = 内距驱动模型（h-auto +
      // 内距），二者同时给时以 `padding` 为准**（cva 输出顺序在本轴在后，twMerge 会丢弃
      // `size` 的 `h-*` / `px-*`）。
      //
      // 命名：本轴**不叫 `inset`**（2026-09-28 裁决）。`ui/card.tsx` 的内距轴叫 `inset`
      // 且用**语义档**（xs/sm/md/lg/xl，一维全向 `p-N`）；本轴是**二维内距对**
      // （`px-* py-*`），语义档名会给「同横不同纵」的形态编出撒谎的名字，故档名即类值。
      // 两者值域形态不同 ⇒ 必须异名（通则：同名轴若值域形态不同必须异名）。
      //
      // 与 `size="icon-*"` 的关系：图标档给的是**完整几何**（`size-N` 定宽定高），与
      // 本轴的「内距驱动几何」是两套模型；同给会产生「定宽 + 自高」的矛盾几何
      // （已复现：`size="icon-xs" padding="p-1"` → `size-6 h-auto p-1`）。组件在下方
      // **内建优先级**：`size` 为 `icon*` 时忽略本轴，故此处无需调用方自行避让。
      //
      // 默认档为空串 ⇒ 既有全部 variant × size × tone 档的输出**逐字节不变**（纯增补）。
      padding: {
        default: "",
        // 方形内距（图标钮 / 紧凑方钮）
        "p-0.5": "h-auto p-0.5",
        "p-1": "h-auto p-1",
        "p-1.5": "h-auto p-1.5",
        // 密集工具条钮 / chip
        "px-1.5 py-0.5": "h-auto px-1.5 py-0.5",
        "px-2 py-0.5": "h-auto px-2 py-0.5",
        "px-2 py-1": "h-auto px-2 py-1",
        "px-2.5 py-1": "h-auto px-2.5 py-1",
        // 列表行钮 / 面板内动作钮
        "px-2 py-1.5": "h-auto px-2 py-1.5",
        "px-2.5 py-1.5": "h-auto px-2.5 py-1.5",
        "px-3 py-1.5": "h-auto px-3 py-1.5",
        // 对话框内选项钮 / 卡片式钮
        "px-2.5 py-2": "h-auto px-2.5 py-2",
        "px-3 py-2": "h-auto px-3 py-2",
        "px-3 py-2.5": "h-auto px-3 py-2.5",
      },
      // —— E 类批 0b 二次补档（2026-09-28）：字阶轴 ——
      // 口径同上（生产裸 `<button>` 的形态聚类）。值域只收实测有量级的 `text-2xs` /
      // `text-xs` / `text-sm`：`text-sm` 与 Button 基线同值，保留为独立档是为了让
      // `size="xs"`（自带 `text-xs`）等场合能**把字阶还原回基线**，而不是「无档可表达」。
      // 刻意**不设** `text-3xs` / `text-lg`：
      //   · `text-3xs` —— 两条独立理由。①宪法 §2.4「任何中文 ≥ `text-xs`，`text-3xs/2xs`
      //     仅用于徽标内数字 / 图表轴 / 纯 Latin 元数据」；②实测先例（含本仓展示页）的**主体**
      //     是徽标内数字、`font-mono` 元数据、`ml-auto` 计数一类**非动作形态**，把动作文案
      //     压到 3xs 属存量违规，不应由 Button 档位予以固化。要补须先有「3xs 的动作文案」
      //     先例，并同时修改 §2.4。
      //   · `text-lg` —— 先例量级不足（仅 1 处，且是展示页里的装饰性大按钮）。
      // 对照：`text-2xs` 同受 §2.4 约束，但它确有**动作文案**先例（工具条钮 / chip 上的
      // 动作标签），立档是为了让这些存量形态**可被表达、进而可被迁移**；这不改变 §2.4
      // 对该轴中文用例的约束——中文动作文案仍应 ≥ `text-xs`，§2.4 由评审把关（无脚本）。
      //
      // 命名的可读性陷阱（本仓既有裁决点名的）：档名 **不叫 `text`**——`text` 作为
      // prop 名会被读成「按钮文案」，且与 Tailwind 的 `text-*` 类名（字号 / 颜色 / 对齐
      // 三义）同词；`fontSize` 与 CSS 属性同名、无歧义。档值与 token 后缀一一对应
      // （`2xs` → `text-2xs`）。
      // 默认档为空串 ⇒ 既有输出逐字节不变（纯增补）。
      fontSize: {
        default: "",
        "2xs": "text-2xs",
        xs: "text-xs",
        sm: "text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      // 默认档为空串 ⇒ 既有全部 variant × size 档的输出**逐字节不变**（纯增补）。
      tone: "default",
      padding: "default",
      fontSize: "default",
    },
  }
)

type ButtonSizeAxis = NonNullable<VariantProps<typeof buttonVariants>["size"]>;
type ButtonPaddingAxis = NonNullable<VariantProps<typeof buttonVariants>["padding"]>;

/**
 * 内距轴与 size 轴的**解析优先级**（2026-09-28 裁决）。
 *
 * `size="icon-*"` 给的是**完整几何**（`size-N` 定宽定高），`padding` 给的是
 * **内距驱动几何**（`h-auto` + 内距）——两套模型同给会产生「定宽 + 自高」的矛盾几何
 * （已复现：`size="icon-xs"` + `padding="p-1"` → `size-6 h-auto p-1`）。icon 档更封闭，
 * 且实测缺档形态里不含「定宽图标钮再改内距」，故 icon 档下**忽略** `padding`。
 *
 * 独立成导出函数（而非内联在 JSX 里）是为了让这条优先级可被**逻辑单测**锁住——
 * 按 §18.2，组件测试不得断言 className，而该优先级只影响类串，故只能在逻辑层断言。
 */
export function resolvePaddingAxis(
  size: ButtonSizeAxis,
  padding: ButtonPaddingAxis,
): ButtonPaddingAxis {
  return size.startsWith("icon") ? "default" : padding;
}

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
  tone = "default",
  // padding / fontSize 是**只给 cva 用**的轴，必须在此解构——否则会被 `...props`
  // 透传到 DOM（`fontSize` 这类 camelCase 属性还会触发 React 警告）。
  // 见 button.test.tsx 的「轴不泄漏到 DOM」用例。
  padding = "default",
  fontSize = "default",
  children,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  // 内建优先级（2026-09-28 裁决）：`size="icon-*"` 是完整几何档（`size-N` 定宽定高），
  // 与 `padding` 的「h-auto + 内距」是两套模型；同给会得到「定宽 + 自高」的矛盾几何
  // （已复现 `size="icon-xs" padding="p-1"` → `size-6 h-auto p-1`）。icon 档更封闭，
  // 故 icon 档下**忽略** `padding`。解析逻辑见 `resolvePaddingAxis`。
  const effectivePadding = resolvePaddingAxis(size, padding);
  return (
    <ButtonPrimitive
      data-slot="button"
      // tone 档的色类靠本属性拿到特异性（见上方 tone 轴注释）。
      // 默认档传 undefined ⇒ 属性不落 DOM，既有用法的渲染结果零变化。
      data-tone={tone === "default" ? undefined : tone}
      className={cn(
        buttonVariants({
          variant,
          size,
          tone,
          padding: effectivePadding,
          fontSize,
          className,
        }),
      )}
      {...props}
    >
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
