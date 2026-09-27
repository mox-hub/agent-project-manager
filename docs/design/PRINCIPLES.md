# APM 前端设计宪法

**版本：v2.0（2026-09-27 语义化 token 层落地）** — v2.0 已执行 A 类修改方案（`修改方案-A类-2026-09-27.md`）：字阶/阴影/字重/行高/动效全面 token 化并配机器强制，token 名称与数值彻底解耦（`text-10` → `text-3xs`）。v1.2（2026-09-26 增补 §10.5）；v1.1（2026-09-25 增补 §10.4）；v1.0（2026-08-30 用户确认 D1-D9 后转正）。
**地位**：`apps/frontend` 所有样式改动的最高依据。与 `COMPONENTS.md`（组件清单）、`AGENTS.md` §3/§6.2 并列；冲突时以本文档为准。AI 会话开工前必读（由 `frontend-page` skill 强制）。

---

## 决策记录

| # | 决策 | 结论 |
|---|------|------|
| D1 | 分区策略 | shell/空态走极简，内容区走高密度（§1） |
| D2 | 主题 | 只留 `default` 一套 preset（linear 的值已成为 default 基线），保留 preset 接口（§5.6）**〔v2.0 修订：原为「只留 linear」，`figma`/`notion`/`linear` 三套已归一〕** |
| D3 | 字阶 | 8 档语义阶梯 `text-3xs/2xs/xs/sm/base/lg/xl/2xl`，**名称与 px 解耦**（§3）**〔v2.0 修订：原为 `text-xs/sm/10/11` 四档+数字直读〕** |
| D4 | 中文字体 | 思源黑体（Noto Sans SC），自托管（§2） |
| D5 | 中文最小字号 | ≥ `text-xs`(12px)，`text-3xs/2xs` 仅非中文（§2.4）**〔v2.0 改名〕** |
| D6 | 字重 | 只留 400/500/600（§2.3） |
| D7 | 间距奇数档 | 冻结禁新增，存量随批 1 迁移（§4.1） |
| D8 | mock | 全部下沉 msw 网络层，生产禁用（§9） |
| D9 | 评审基准 | 暗色优先（§1.4） |
| D10 | 阴影 | **全站唯一投影档 `shadow-xs`**；`shadow-none` 为重置档；其余具名档与裸 `shadow` 一律封禁（§3.6）〔v2.0 新增〕 |
| D11 | hover 抬升 | 唯一阴影档下 hover **不再抬升阴影**，反馈改由边框/背景/位移/环色承载（§3.6）〔v2.0 新增〕 |
| D12 | 动效 | 时长白名单 120/180/240ms；token 命名空间必须是 `--transition-duration-*`（§7.1）〔v2.0 新增〕 |

---

## §1 定位与分区

1.1 本产品是**数据密集型项目管理工具**。整体气质对标 Linear 的信息密度纪律 + Codex 的极简 chrome。

1.2 **分区策略**（最高层决策，所有页面生成前先判断所在区）：
- **极简区**：shell 骨架（侧栏/顶栏 chrome）、空态、引导/欢迎画布、命令面板。特征：留白、少 chrome、层级分明。
- **高密区**：列表、看板、详情页、面板、属性区、表格。特征：紧凑单元格、信息优先、弱装饰。

1.3 **密度公式**：密度来自单元格（小 padding、密行高），舒适来自区间（页边距、区块间距给足）。禁止用单元格内的留白制造"高级感"。

1.4 **评审基准：暗色优先**。暗色做到位后，亮色从同一套 token 派生，不做独立设计。

---

## §2 字体

2.1 **family 唯一入口**：组件只许用 `font-sans` / `font-mono` 两个 token（`index.css` @theme）。设置页自定义字体通过覆写 `--font-user-sans` / `--font-user-mono` 实现，组件禁止直接引用用户变量。

2.2 **字体链**（自托管 woff2 至 `public/fonts`，禁止 CDN @import）：
- sans：`Inter, "Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`
- mono：`JetBrains Mono, ui-monospace, SFMono-Regular, "Noto Sans SC", monospace`

2.3 **字重只许 400 / 500 / 600**：600 = 标题与强调；500 = 次强调与可交互文本；400 = 正文。禁止 300/700。

2.4 **中文最小字号：任何中文文本 ≥ `text-xs`(12px)**。`text-3xs`/`text-2xs` 仅用于徽标内数字、图表轴、纯 Latin/符号元数据。

2.5 中文正文基准 `text-sm`(14px)；Inter 的数字/Latin 与思源黑体的中文混排不做额外补偿。

---

## §3 字阶（唯一阶梯）

3.1 只允许以下 8 档，逐档角色固定。**token 名与 px 值彻底解耦**——名字是语义档名，不是像素读数（v2.0 起 `text-10`/`text-11` 已废止，禁止回流）：

| token | px | 角色 |
|-------|----|----|
| `text-3xs` | 10 | 徽标内数字、图表轴、微元数据（非中文） |
| `text-2xs` | 11 | badge、辅助标签、密集元数据（非中文正文） |
| `text-xs` | 12 | UI 小字基准：列表次要行、属性值、小按钮；中文正文下限 |
| `text-sm` | 14 | **全站基准**：正文、列表主行、输入框、表单 |
| `text-base` | 16 | 阅读型正文（描述区、文档段落） |
| `text-lg` | 18 | 面板/卡片标题（CardTitle 基线）+ **列表页页面标题**（`PageHeader` 的实际基线，见 `components/ui/page-header.tsx`） |
| `text-xl` | 20 | 区块大标题；二级页/详情页标题 |
| `text-2xl` | 24 | 大数字 KPI + 独立页 `h1`（欢迎页、桌面初始化页、文档标题栏）；**全站最大档，写 `text-3xl` 及以上即越界** |

3.2 **迁移映射（v2.0 已执行完毕，留档备查）**：`text-10 → text-3xs`；`text-11 → text-2xs`；`text-8/9 → text-3xs`；`text-12 → text-xs`；`text-13 → text-xs`；`text-15 → text-sm`；`text-22/28/32 → text-xl / text-2xl`（按语义就近）；越界的 `text-3xl/4xl/5xl/6xl` 一律降到 `text-2xl` 并同时把 `font-bold` 收敛为 `font-semibold`。
> 迁移口径依据：`--text-3xs/2xs` 不带 `--line-height` 配对 → 行高继承，与原 `text-10/11` 行为逐位一致，**视觉零变化**。

3.3 禁止新增 px 直读档与任意值（`text-[13px]` 等，`lint:tokens` 拦截）。旧数字直读档与 `3xl` 及以上越界档由 `lint:spacing` 双向封禁。

3.4 **行高只许语义档**：`leading-none/tight/snug/normal/relaxed/loose`。**数值档（`leading-5`、`leading-8.5` 等）封禁**，由 `lint:spacing` 拦截。使用 Tailwind v4 默认配对行高；多行阅读正文显式 `leading-*`；密列表行高由 §4.2 的行高档控制，不逐行设 leading。
> **唯一例外（已登记附录 A）**：`components/ui/number-field.tsx` 的 `leading-8.5/9.5/7.5` 是**结构性行高**——与同串内 `h-8.5/9.5/7.5` 逐档一一对应，用途是让输入框文字垂直居中，不是排版行高。机械语义化会破坏居中。

3.5 同一视图内文字层级 ≤ 3 档。

3.6 **阴影：全站唯一投影档**（v2.0 新增，D10/D11）。

- 唯一档 `shadow-xs`（`0 1px 2px 0 rgb(0 0 0 / 0.05)`，已显式入 `@theme`）；复位档 `shadow-none`。**其余具名档（`2xs/sm/md/lg/xl/2xl/inner`）与裸 `shadow` 一律封禁**，由 `lint:spacing` 全库拦截。
- **hover 不抬升阴影**：唯一档之下 hover 已无「更高一档」可去。静置态保持 `shadow-xs` 不动，hover 反馈改由**边框 / 背景 / 位移 / 环色**承载（如 `hover:border-border/80`、`hover:bg-muted/50`、`hover:-translate-y-0.5`、`hover:ring-2 hover:ring-ring/30`），并把随之失效的 `transition-shadow` 改为 `transition-colors`。
- 推理链：若某处静置无投影、靠 hover 出投影，那是把「唯一档」用作交互态而非层级，与 D10 相冲；正确解法是把常驻层级交给 `shadow-xs`，交互态交给颜色。
- **不采用「命名空间闭合」**：A 类方案 §3.6 曾建议 `--shadow-*: initial` 以让违规档物理上不生成 CSS。经裁决**不实施**——它会连带抹掉附录 A 已豁免的 vendored 原语与 design-system 展示页的投影，把「豁免」变成静默破版。物理闭合与豁免机制不可并存，取豁免 + lint 拦截。
- **`font-bold` 与 `text-3xl` 的连带关系**：越界大标题降档时必须同时收敛字重（§2.3），避免「大而粗」的旧观感残留。

3.7 **字重与动效的机器强制**：`font-bold(700)/light(300)` 与白名单外时长（`duration-100/150/200/250/300/500/700/1000` 及任意值）均由 `lint:spacing` 封禁，迁移映射见 §2.3 / §7.1。

---

## §4 间距与行高档

4.1 **4px 网格**：spacing 只用整数档与 `.5` 档（如 `p-2`、`gap-3.5`、`w-65`）。四分之一档（`0.75 / 1.25 / 2.75 / 3.25 / 4.25 / 5.25`）**冻结：禁止新增使用，存量随批 1 迁移到最近标准档**。

4.2 **列表行高全站两档**：dense 32px / comfortable 40px，同一列表只选一档。

4.3 **单元格**：`py-1.5` ~ `py-2`；**卡片内** `py-4`（Card 基线）；**页面水平边距** `px-4` ~ `px-6`（16-24px）；**区块垂直间距** 24px（`space-y-6`）。

4.4 表单：label 与控件 `gap-1.5`（6px），字段间 16px（`space-y-4`）。

---

## §5 颜色与主题

5.1 只许语义 token（`background/card/popover/sidebar/content-*/accent-*/status-*/chart-*`），禁止原始 hex/hsl——className 与内联 style 均禁止。**门禁分工**：原始色板类（`bg-emerald-500`）、`Loader2` 直用与内联裸色由 `lint:palette` 拦截；语义前缀类是否在白名单内由 `lint:semantic` 拦截（`ALLOWED` 逐项登记）。

5.2 **分层靠背景深浅**（background → card → popover），不靠加边框。同一视图边框只用 `border` 一个 token，禁止 `border` 与 `content-border-light` 同屏混用。

5.3 **语义色只表达状态与分类**（accent-blue/green/yellow/red/orange/purple、status-*），禁止当装饰色使用。

5.4 文字层级只用三档：`content-text`（主）/ `-secondary`（次）/ `-muted`（弱）。**`content-text-tertiary` 已于 v2.0 删除**（与 `-muted` 语义重复，同屏两档弱灰无法分辨）——禁止新增第四档，也禁止复活 `tertiary` 命名（`lint:semantic` 的 `ALLOWED` 白名单逐项登记，未登记即拦截）。

5.5 深浅模式一律 token 自动跟随；禁止 `dark:` 前缀内嵌具体色值覆写（结构性差异除外，须在附录豁免清单登记）。

5.6 **主题：只保留 `default` 一套 preset**（v2.0 归一，原 `linear`/`figma`/`notion` 三套已废止，linear 的值成为 default 基线）。保留 preset 接口与 `presets.ts` 结构（后续加主题 = 扩展 `ThemePreset` 类型 + `index.css` 增加对应 token 段）。历史存量值（`linear`/`figma`/`notion`）与未知值一律回落 `default`，并在读取时一次性覆写 localStorage（`getInitialThemePreset` 自愈逻辑，key 刻意不改名以免双重迁移）。

---

## §6 图标

6.1 UI 图标唯一库：**lucide-react**。`@lobehub/icons` 仅限 AI 供应商/品牌 logo。emoji 仅允许出现在用户生成内容中。

6.2 尺寸配对（字号 token 与图标 px **软配对**，无机器强制，靠评审约束）：`text-3xs`/`text-2xs` 配 12px 图标；`text-xs` 配 14px；`text-sm` 及以上配 16px；标题配 20px。

6.3 图标与文字 `inline-flex items-center gap-1.5` 对齐；图标颜色跟随所在文字档的颜色 token，禁止独立配色。

---

## §7 动效

7.1 **duration 白名单**：120ms（hover/按压微交互）/ 180ms（展开、弹出、常规过渡）/ 240ms（大面积面板、强调）。类名三档 `duration-fast` / `duration-normal` / `duration-slow`，缓动两档 `ease-standard` / `ease-emphasis`。

> ⚠️ **命名空间陷阱（v2.0 血案，务必先读再改）**：Tailwind v4 生成 `duration-<name>` 读的是 `--transition-duration-<name>` 主题键（`valueThemeKeys: ["--transition-duration"]`），**不是** `--duration-<name>`；`ease-<name>` 读 `--ease-<name>`。本轮迁移曾把 token 写成 `--duration-fast: 120ms`，**CSS 静默不生成**——82 处 `duration-*` 类全部失效且无任何报错（lint 也不报，因为类名本身合法）。故 `index.css` 中两条命名刻意不一致：
> ```css
> --transition-duration-fast: 120ms;  /* → duration-fast */
> --ease-standard: cubic-bezier(0.2, 0, 0, 1);  /* → ease-standard */
> ```
> **这处不一致是规范，不是笔误**：不要「顺手统一」成 `--duration-*` 或 `--transition-ease-*`。
>
> **两套 `--motion-*` 家族与本题无关**：`index.css` 另有一族 `--motion-fast/normal/slow` + `--motion-ease-*`（第 268–272 行），它只驱动手写的 `.motion-shift` / `.motion-enter` / `.motion-exit` 组合类，**不生成任何 Tailwind 工具类**。二者数值相同、用途不同，禁止互相替换；改数值时须同步两处，否则 `.motion-*` 与 `duration-*` 会漂移。
>
> 兜底：`lint:undefined`（`check-undefined-classes.mjs`）比对源码类名与构建产物选择器，上述静默失效已被纳入 CI 的构建后检查，可捕获同类回归。

7.2 只动 `opacity` 与 `transform`；hover 背景变色（color transition）除外。

7.3 分工（`.motion-*` 组合类定义在 `index.css`，五个：`motion-enter` 入场 / `motion-shift` 交互态 / `motion-emphasis` 强调 / `motion-micro` 微交互 / `motion-expand` 展开折叠）：交互态统一 `.motion-shift`；入场 `.motion-enter`；弹出层用 tw-animate-css 的 `data-*` 变体；framer `motion` 仅用于布局动画（FLIP、拖拽排序）。禁止三套体系用于同一元素。

7.4 全站尊重 `prefers-reduced-motion`（全局规则已有，组件不得绕过）。

---

## §8 交互三态与键盘

8.1 **三态 token 固定**：
- hover：`bg-accent`（sidebar 域内用 `sidebar-accent`，content 域内可用 `content-bg-secondary`，同区域二选一）
- selected：`bg-accent` + `text-accent-foreground`，禁止自造选中色
- focus-visible：`ring-ring` 统一 ring，禁止自定义 outline 色

8.2 列表/表格必须支持 `↑↓`（或 j/k）导航 + Enter 打开 + Escape 关闭浮层；`Ctrl/Cmd+K` 唤起命令面板。

8.3 整行可点击时，行内按钮必须 `stopPropagation`（交互规则，列入自检防漏）。

---

## §9 数据真实性与 mock

9.1 **mock 只存在于 msw handler 层**（按真实 API contract 编写）；组件/页面层禁止硬编码假数组、假常量。

9.2 handler 数据量 ≥ 30 条真实感记录（供密度/滚动/分页评审）；内置 latency 与错误场景开关，供三态（loading/empty/error）评审。

9.3 生产构建禁用 msw；mock 模式下页面挂统一 `MockBadge` 原语角标。

---

## §10 组件治理

10.1 **唯一实现**：任何 UI 能力有且仅有一个实现，登记于 `COMPONENTS.md` 并在 design-system 页展示。同名/同能力第二实现即债务，发现即登记清除。

10.2 **页面装配原语**（先收口、再迁移页面）：`PageHeader`、`ToolbarRow`/`SubPageToolbar`、`SectionCard`、`DataList`（列表行原语，含单元格件）、`PropertyRow`/`PropsCard`（property-panel 套件）、`AsyncState`/`EmptyState`、`Skeleton` 套件、`MockBadge`（§9）。新页面必须由装配原语 + `components/ui/` 基础组件构成。

10.3 改造旧页面 = 按模板重写骨架并迁移数据逻辑（沿用 `frontend-page` skill 规则），禁止在旧结构上叠加样式修补。

10.4 **Overlays 抽屉（Sheet 套件）宽度与标题栏**（v1.1 增补，2026-09-25 用户确认）：侧滑详情/表单一律用 `ui/sheet.tsx`（base-ui 配方，§10.1 唯一实现）。

- **宽度三档**（`side="right"/"left"`，禁任意值；窄屏一律 `w-full` 全宽）：
  - 轻量确认/短表单：`sm:max-w-sm` ~ `sm:max-w-md`（384~448）
  - 内容详情/日志流：`sm:max-w-lg` ~ `sm:max-w-xl`（512~576）
  - 卡片拍板/富详情（决策卡、通知详情等含动作卡片与面板的内容）：`sm:max-w-2xl`（672）
- **标题栏**：`SheetTitle` 必给（对话框 a11y 名称；纯区块头时用 `sr-only`），置于 `SheetHeader` 并右侧让位 `pr-12` 给关闭钮；关闭钮一律用套件内置 `showCloseButton`，禁自画 X；头部与正文分界用 `border-b border-border/60`。
- **正文区**：容器 `gap-0 p-0` 自管内距，内容包裹 `min-h-0 flex-1 overflow-y-auto`；底部固定动作在内容流内 `mt-auto`，禁在头部堆叠动作按钮。
- **动效**：套件内置过渡（200ms）为官方配方原样保留，页面层禁自定 duration/缓动。

10.5 **全局搜索悬浮面板**（v1.2 增补，2026-09-26 夜航 0.7.4 落地）：
- **唯一形态**：全局搜索 = 命令面板搜索模式（`shared/command-palette` 同一 base-ui Dialog 浮层，与命令/AI 问答三态同体）。禁止再造任何独立搜索页面或第二个搜索浮层。
- **入口三线归一**：`mod+k`（面板热键）、`global-search` 热键（缺省 `mod+shift+f`，CAP-A-17 注册表可改键）、侧栏搜索按钮与 `cmd-search` 命令——全部只做一件事：打开命令面板。`/app/search` 路由仅存重定向兜底（开面板 + 回项目列表），页面组件已退役。
- **检索面**：`/search` 全部六类实体（task/bug/document/project/milestone/acceptance），命中按实体类型分组渲染（组间序：工单→Bug→文档→项目→里程碑→验收），防抖 300ms、staleTime 30s；零命中回车转 AI 问答（Tab 直通）为既有回退，保持不变。
- **列表页行内预览（已撤销）**：DataList 行级 hover 预览卡（`itemPreviewPath`）随 v0.7.4 验收反馈撤销（2026-09-26 裁决：行级不直接出卡片预览，实体卡预览只走 route-preview 既有挂载面）；右键菜单二级搜索（候选 ≥8 自动启用）与子菜单限高 `max-h-80` 滚动保留，仍为列表交互标准配套。

---

## §11 豁免与修订

11.1 lint 拦不住的违例（结构性 `dark:` 覆写、暂留的奇数 spacing 等）必须在附录《豁免清单》登记：文件 + 原因 + 计划清除批次。

11.2 宪法修订须经用户确认，改版本号并同步更新 `frontend-page` skill 与 `AGENTS.md` 引用。

---

## 附录 A 豁免清单

> 登记格式：**文件/范围 + 豁免规则 + 原因 + 清除计划**。每一项都必须在对应脚本的 `FILE_EXEMPTIONS` / `EXEMPT` 中有同源实现——**附录与脚本必须成对改动**，只写附录不改脚本等于没豁免（lint 照报），只改脚本不写附录等于暗箱豁免（审计不可见）。

### A.1 机器强制豁免（与脚本逐条对应）

| # | 范围 | 豁免规则 | 原因 | 清除计划 |
|---|------|---------|------|---------|
| A1 | `shared/mdx/**` | `text` / `font` / `leading` | MDX 渲染的是**外来 markdown 内容**，字阶/字重/行高由内容作者与 prose 排版配方决定，不受产品型字阶约束 | 不计划清除——是边界，不是债务 |
| A2 | `components/ui/drawer.tsx`、`components/ui/navigation-menu.tsx` | `motion` / `shadow` | **上游 vendored 原语**（coss / base-ui）：动效常量与手势物理耦合，浮层投影属其官方配方；改数值会破坏上游升级路径 | 跟随上游版本升级时复核（§11.1） |
| A3 | `components/ui/number-field.tsx` | `leading` | **结构性行高**：`leading-8.5/9.5/7.5` 与同串 `h-8.5/9.5/7.5` 逐档配对做输入框文字垂直居中，非排版行高；机械语义化会破坏居中 | 不计划清除——改的是几何，不是排版 |
| A4 | `modules/design-system/**` | `*`（全部） | **设计系统展示页**的存在意义就是陈列 token 名与各档对照，必然出现规范禁止的档位（同 `check-palette.mjs` 的既有白名单惯例） | 不计划清除（展示页属性） |
| A5 | `modules/linear/**`、`appearance-section.tsx`、`ui/spinner.tsx` | 颜色（`check-palette.mjs`） | linear 品牌色需原值；外观设置的主题预览缩略图**预览即字面色**；spinner 的色环属其实现细节 | 不计划清除（均为设计上可解释的用例） |

> **A2+A4 曾导致一次方案否决**：A 类方案 §3.6 第 3 步建议设 `--shadow-*: initial` 让违规档「物理上无法生成 CSS」。经裁决**不实施**——命名空间闭合会连带抹掉 A2/A4 已豁免的投影，把「豁免」变成静默破版。**物理闭合与豁免机制不可并存**，取「豁免 + lint 拦截」（§3.6）。同一原因，`check-palette.mjs` 中的 `RAW_SHADOW` 系列正则已整体删除，阴影治理单点收敛到 `check-spacing-governance.mjs`。

### A.2 交互态裁决登记（非豁免，是决策留档）

**hover 抬升阴影的 11 处处置**（D11 落地，2026-09-27 用户决策：`改用边框/背景做 hover 反馈`）。这些位置在 v2.0 前靠 `hover:shadow-md` 之类的抬升表达可交互性；唯一阴影档下无「更高一档」可去，故逐处改写：

| 落点 | 原写法 | 改为 | 说明 |
|------|--------|------|------|
| `ui/stat-card.tsx` | `hover:shadow-md` | 删除（保留既有 `hover:bg-muted/50`） | 已有背景反馈，阴影本就冗余 |
| `core-config/…/template-manager.tsx` ×2 | `shadow-xs transition-shadow hover:shadow-md` | `shadow-xs transition-colors hover:border-border/80` | 常驻层级交给 `shadow-xs`，交互态交给边框 |
| `document/pages/documents-page.tsx` ×2 | `hover:shadow-md` / `hover:shadow-2xs` | 删除（保留既有 `hover:border-border/80`） | — |
| `project/pages/dashboard-page.tsx` | `hover:shadow-md` | 删除（保留既有 `hover:ring-2 hover:ring-ring/30`） | — |
| `team-member/components/member-card.tsx` | `transition-shadow hover:shadow-md` | `transition-shadow hover:ring-border` | `Card` 自带 `ring-1 ring-border/50`，hover 加深 ring 色即可（ring 色属 box-shadow，故 `transition-shadow` 仍有效） |
| `team-member/components/team-card.tsx` | 同上 | 同上 | 同上 |
| `workflow/components/workflow-canvas.tsx` | `hover:shadow-md` | `hover:ring-2 hover:ring-ring/30` | **偏离机械映射**：节点 `border-*` 承载节点类型语义（如 `border-accent-purple/40`），`hover:border-border/80` 会抹掉类型标识，故改用 ring |
| `shared/components/board-view/board-view.tsx` | `hover:shadow-md` | `hover:-translate-y-0.5 dark:shadow-none` | 抬升改由位移表达，不放投影 |
| `shared/components/create-dialog/mode-shuttle-button.tsx` | `hover:shadow-*` | `shadow-xs`（静置常驻） | 同上，且 `duration-300` → `duration-slow` |
| `modules/linear/components/linear-provider-card.tsx` | `hover:shadow-*` | `hover:border-white/20` | — |

> 另修：`modules/linear/` 曾出现 `hover:shadow-brand-linear/20`——`--shadow-brand-linear` **从未注册**，是幽灵类（写了不生效）。已随本次迁移删除；这也是 `modules/linear/` 的 shadow 豁免条目被判定为死配置并移除的证据。

### A.3 待办登记（尚未落地的 `[MUST]`）

**E 类 §19（`修改方案-E类-2026-09-27.md`）暂未写入本宪法**。该节 19.1–19.6 的条款均为 `[MUST]`，但当前**没有任何机器强制可覆盖它们**；而 E 类自身规则要求「没有机器强制的 `[MUST]` 不写进宪法」——写进去只会得到一条无人可查的纸面禁令。

处置：**(a)** 条款继续留在 E 类方案文档中作为设计意图待办；**(b)** 待其配套 lint/ESLint 规则落地后，再按 §11.2 走宪法修订（改版本号 + 同步 `frontend-page` skill 与 `AGENTS.md`）正式升格。


