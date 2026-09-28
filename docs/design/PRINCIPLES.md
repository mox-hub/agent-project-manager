---
title: PRINCIPLES.md - APM 前端设计宪法
description: apps/frontend 所有样式改动的最高依据——字阶/间距/行高/字重/阴影/动效/token 的规则正文与机器强制口径
status: active
created: "2026-08-30"
scope: apps/frontend
governance: "本文件为最高依据；下位文档 DESIGN.md（参考规格）、COMPONENTS.md（组件清单）、apps/frontend/AGENTS.md（流程/目录/命令）、各 skill 一律只引用不承载设计规则，冲突时以本文件为准"
---

# APM 前端设计宪法

**版本：v2.4（2026-09-28 增补）** — 本版新增 §4.5 的**chip / toggle 胶囊例外**：主条「按钮一律 `rounded-md`」与仓内既有一批胶囊形 chip / toggle 控件长期冲突，经 2026-09-28 裁决承认该形态**合法**（零视觉变更、不清退），同时**限定语义、禁止泛化**（普通动作按钮仍一律 `rounded-md`）。本条**无对应 `check-*.mjs` 执行规则**——圆角维度自始没有脚本，§11.2 第 3 步无可同步项（已在 `CHANGELOG.md` 声明）。**版本：v2.3（2026-09-27 修正）** — 本版修正 v2.2 的两处条文缺陷。①**§8.4 的 z 命名空间键名写错**：原稿 token 列写作 `--z-base`/`--z-modal`，实测 Tailwind v4 的 z 工具只认 `--z-index`，按字面落地会**静默生成 0 CSS**——与 §7.1 时长陷阱同型（`duration-<name>` 读 `--transition-duration-<name>`），故把「token 键名 ≠ 工具类前缀」立为通则并要求构建产物 + `getComputedStyle` 双向实证。②**§4.5 的按钮档位自相矛盾**：sm 行「紧凑按钮」与 md 行「控件默认（按钮…）」两处都覆盖按钮，经 2026-09-27 裁决统一为「**按钮一律 `rounded-md`，不因尺寸降档**」，sm 收窄为「控件内嵌块」。v2.2（2026-09-27 补条文）— 本版把 D 类十二条文写入正文：§4.5 圆角五档 + 胶囊、§8.4 层级（z-index）七档、§8.5 无障碍最低要求、§10.6 三态选型决策树、§10.7 组件 API 约定、§12 `data-ai-*` 标注协议、§13 表单、§14 数字与日期格式化、§15 响应式、§16 文案、§17 图表、§18 组件测试基线（条文来源：`docs/design/修改方案-BCD类-2026-09-27.md` 第三部分 D 类）。v2.1（2026-09-27 权威收口）— 本版按 A 类修改方案 §1.2(1)(3) 重写「地位」段（删除「与 COMPONENTS.md / AGENTS.md §3 并列」的表述——它把下位文档抬成同级真相源，是 A3/A4/A6/A7 四条矛盾的制度根源），新增《效力链》与《版本号规则》，并重写 §11.2 修订流程。v2.0（2026-09-27）语义化 token 层落地：字阶/阴影/字重/行高/动效全面 token 化并配机器强制，token 名称与数值彻底解耦（`text-10` → `text-3xs`）。v1.2（2026-09-26 增补 §10.5）；v1.1（2026-09-25 增补 §10.4）；v1.0（2026-08-30 用户确认 D1-D9 后转正）。
**地位**：本文件是 `apps/frontend` / `apps/desktop` 界面设计的**唯一真相源**。其余文档（`DESIGN.md`、`apps/frontend/AGENTS.md`、`COMPONENTS.md`、各 skill）一律**只引用、不承载**设计规则；任何与本文冲突的表述以其为准，并须在当次 PR 中删除。

**效力链**：本文件 → `apps/frontend/scripts/check-*.mjs`（本文件的机器执行镜像）→ 代码。脚本与本文冲突时，先修脚本再合代码。

**版本号规则**：宪法版本号**只在本文件头部声明一处**。其他文档一律写「见 `docs/design/PRINCIPLES.md`」，**禁止抄写版本号**（历史上曾同时存在 v1.0/v1.1/v1.2 三个口径）。唯一例外是**明确标注为历史沿革或存档原文**的段落——其中的旧版本号是对既成事实的记录，不构成本版本主张。

AI 会话开工前必读（由 `frontend-page` skill 强制）。

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

4.5 **圆角五档 + 胶囊**（唯一阶梯，禁任意值）：

| token | 值 | 用途 |
|-------|----|------|
| `rounded-xs` | 2px | 标签内小标、热力格、勾选指示器 |
| `rounded-sm` | 8px | 小控件内嵌块（行内 code/kbd、进度轨、skeleton） |
| `rounded-md` | 10px | **控件默认**（按钮 / 输入 / 选择 / 触发器） |
| `rounded-lg` | 12px | **卡片 / 面板 / 区块容器** |
| `rounded-xl` | 16px | 模态 / 浮层 / 大容器 |
| `rounded-chip` | 999px | 胶囊（badge / pill / 头像 / 开关） |

- 禁止裸 `rounded`（Tailwind 默认 4px，非本仓 token）；
- 禁止 `rounded-2xl` 及以上（与 `rounded-xl` 同值，属重复档）；
- `rounded-full` 仅限 chip/头像场景，等同 `rounded-chip`；
- **按钮一律 `rounded-md`**（含微图标按钮），**不因尺寸降档**——`rounded-sm` 只用于「嵌在其他控件内部的块」（行内 code/kbd、进度轨、skeleton），不用于按钮本体。
- **例外（2026-09-28 裁决）：chip / toggle 语义的按钮可用胶囊档**——当控件的**语义是「标签 / 筛选片 / 开关态 / 分段项」而非「触发动作」**时，取 `rounded-chip`（与 `rounded-full` 等值），本宪法**承认该形态为合法**，非违规、不列入存量清退。
  - 限定（**不得泛化**）：仅限 chip / toggle / 筛选片 / 分段项 / 反应条一类**可切换或标签性**控件；同一组内各 chip 圆角必须一致；**普通动作按钮（提交 / 创建 / 删除 / 图标按钮）仍一律 `rounded-md`**（上一条不变，本例外不构成对它的削弱）；不得据此把胶囊档用于卡片、面板、输入、选择器、下拉触发器等容器或表单控件。
  - 规模登记（§11.2 第 5 步）：该形态**不在本条文内固化数量**（宪法管规则、`COMPONENTS.md` 管清单），仅记 2026-09-28 协调方复算的**两个口径**，供后人核数时对齐：生产文件（`src/components/ui/` 之外，排除 `*.test.*` / `*.stories.*`）中「胶囊类名 + 控件标签」的**元素级**共现，**仅小写 `<button>`** 为 **37 处 / 28 文件**，**含 `<Button>` / `<Badge>`** 为 **53 处 / 36 文件**（`<button` 37 / `<Button` 10 / `<Badge` 6）。批 0 方案侧原记「35 处 / 27 文件」，与前者相差 **2 处 / 1 文件**（未定位，属「口径决定答案」型偏差，非量级分歧）；本条文以**规则**为准，不因数量而变。
  > 消歧记录（2026-09-27 裁决）：本表 sm 行原写「小控件内嵌块、**紧凑按钮**」，与 md 行「**控件默认**（按钮…）」两处都声称覆盖按钮，自相矛盾。仓内两类先例各半（`button.tsx` 的 xs/icon 尺寸 `min(var(--radius-md),8px)` 实测钳到 8px、`board-view.tsx` / `assistant-context-chip.tsx` 为 `sm`；`assistant-panel.tsx` / `run-overview-card.tsx` 为 `md`），经裁决取 **md 为唯一按钮档**，消歧而非静默改写。
- 同屏圆角层级 ≤ 2 档（容器 + 内容），禁三层嵌套不同圆角。

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

8.4 **层级（z-index）七档**，禁任意数值：

| 类名 | 值 | 用途 |
|-------|----|------|
| `z-base` | 0 | 常规文档流 |
| `z-sticky` | 10 | 吸顶工具栏 / 粘性表头 |
| `z-dropdown` | 20 | 下拉 / 菜单 / 日期选择 / 过滤面板 |
| `z-banner` | 30 | 全局横幅（连接状态、离线提示） |
| `z-overlay` | 40 | 遮罩 / 全屏加载遮罩 |
| `z-modal` | 50 | Dialog / Sheet / Drawer / 命令面板 |
| `z-toast` | 70 | Toast / 通知（**必须高于 modal**） |

> ⚠️ **命名空间陷阱（本条文 v2.2 原稿写错，v2.3 修正）**：上表列的是**类名**。落地到 `@theme` 时**键名是 `--z-index-<name>`，不是 `--z-<name>`**——Tailwind v4 的 z 工具注册为 `themeKeys:["--z-index"]` / `valueThemeKeys:["--z-index"]`（`tailwindcss@4.3.3` `dist/lib.mjs` 实测）。原稿表头写作 `--z-base`/`--z-modal`，**按字面落地会静默不生成任何 CSS**，新增的 `z-<name>` 类会像幽灵类一样「写了但没样式」。
>
> 这与 **§7.1 的时长陷阱**（`duration-<name>` 读 `--transition-duration-<name>`，非 `--duration-<name>`）是**同一类错误**，故在此立为通则：**Tailwind 的 theme 键名与工具类前缀不总是一致**；凡新增 token 族，必须以**构建产物 + 浏览器 `getComputedStyle`** 双向实证，**不得只凭类名推断键名**。
>
> 实证（同一条 `@theme` 并存 `--z-x: 50` 与 `--z-index-x: 60`）：仅后者生成规则 `.z-x{z-index:var(--z-index-x)}`；落地后七档 `getComputedStyle` 计算值 **0/10/20/30/40/50/70** 全部生效。

**铁律**：浮层嵌套（下拉里的对话框）**不得靠加 z-index 解决**——高层级永远覆盖低层级，嵌套浮层应通过 `<Portal>` 提升到同一层级容器内。历史上 `z-1000`/`z-1001` 正是嵌套补救的产物。

8.5 **无障碍最低要求**（[MUST]，评审必查）：

| # | 要求 |
|---|------|
| 1 | **图标按钮必须有 `aria-label`**（无文字时唯一可访问名） |
| 2 | **所有 Dialog/Sheet/Drawer 必须有标题**（`DialogTitle`/`SheetTitle`；纯装饰用 `sr-only`） |
| 3 | **表单控件必须关联 label**（`FieldLabel htmlFor` 或 `aria-label`），错误用 `aria-describedby` |
| 4 | **不得只靠颜色传达状态**（状态色 + 图标/文案；见 §5.3） |
| 5 | **焦点可见**：一律 `focus-visible:ring-ring`（§8.1），禁 `outline-none` 无替代 |
| 6 | **焦点管理**：浮层打开时移入、关闭时归还触发元素 |
| 7 | **语义标签**：可点击元素用 `<button>`，导航用 `<a>`/`<Link>`；禁 `<div onClick>` |
| 8 | **图片/头像有 `alt`**（装饰性用 `alt=""`） |

**执行**：`eslint-plugin-jsx-a11y` 接入（recommended 规则集），覆盖 1/2/3/7/8；4/5/6 靠评审清单。

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

10.6 **三态选型（loading / empty / error）——决策树强制**

**唯一入口**：数据驱动组件一律使用 `AsyncState`（已封装三态 + retry）；只有「单态场景」（如纯静态区块的骨架）才直接使用下层原语。

**loading**

| 场景 | 用什么 |
|------|--------|
| 首屏 / 路由级加载 | `Skeleton` 骨架，**形状须匹配最终布局**（禁通用灰条堆） |
| 列表 / 表格加载 | `Skeleton` 骨架行（与 §4.2 行高对齐） |
| 卡片 / 面板局部加载 | `Skeleton` 局部骨架 |
| 已有内容的局部刷新 | `Spinner`（尺寸随文字档，§6.2） |
| 按钮提交中 | 按钮 `disabled` + 内联 `Spinner`，**禁遮罩** |
| 全屏阻塞（导出 / 切库 / 保存并离开） | `LoadingOverlay`（唯一合法全屏遮罩） |
| 应用启动 | `GlobalLoadingState` |
| **禁止** | 手写 `animate-spin`、`<div className="loading">`；`ui/spinner` 是唯一加载指示实现（§10.1） |

**empty**

| 场景 | 用什么 |
|------|--------|
| 页面级无数据 | `EmptyState variant="page"`（居中、含 action） |
| 卡片 / 区块内无数据 | `EmptyState variant="card"`（紧凑） |
| 表格 / 列表无行 | `EmptyState variant="card"`，替代「暂无数据」纯文本行 |
| **禁止** | 内联「暂无XX」文案、手写空态 div |

**error**

| 场景 | 用什么 |
|------|--------|
| 请求失败（可重试） | `AsyncState error + onRetry` |
| 页面级崩溃 | 路由 `errorElement`（`shared/pages/error-page`） |
| 局部区块失败 | `EmptyState` + `action` 放「重试」，**不中断整页** |
| **禁止** | 静默吞错（`catch {}` 不提示）、只用 `toast` 报错而界面无状态 |

**文案**：空态标题不带句号、不含「您」；描述一句话说清「为什么空 + 怎么变不空」；action 用动词短语。

10.7 **组件 API 约定**

**组合（composition）**
- 唯一方式：**`render` prop**（`@base-ui/react` 原生 API）。

  ```tsx
  <Button render={<Link to="/x" />}>打开</Button>
  ```

- **禁止 `asChild`**（Radix 遗产，radix 已退场）。存量 `asChild` 须迁移至 `render`。

**Props 命名（全部组件一致）**

| 用途 | 命名 | 反例 |
|------|------|------|
| 附加类名 | `className` | `style` / `customClass` |
| 视觉变体 | `variant` | `type` / `kind` / `look` |
| 尺寸档 | `size` | `sizeVariant` |
| 受控值 | `value` + `onValueChange` | `onChange`（仅原语允许透传） |
| 非受控初值 | `defaultValue` | `initialValue` |
| 禁用 | `disabled` | `isDisabled`（除 base-ui 原生） |
| 加载 | `loading` | `isLoading`（除数据 hook） |

**受控 / 非受控**
- 支持受控的组件必须同时支持非受控（`value` / `defaultValue`）；
- **禁止在受控组件内部用 `useState` 缓存传入值**（值同步 bug 的常见来源）。

**透传**
- 所有组件必须把 `...props` 透传到根元素（`data-*` / `aria-*` / 事件）；
- `ref` 转发到根元素（React 19 起 `ref` 是普通 prop，无需 `forwardRef`）。

**禁止**
- 禁止组件内部硬编码尺寸/颜色（一律走 className + token，见 §3–§5）；
- 禁止新增组件时给「同一能力」换名（§10.1 唯一实现）。

---

## §11 豁免与修订

11.1 lint 拦不住的违例（结构性 `dark:` 覆写、暂留的奇数 spacing 等）必须在附录《豁免清单》登记：文件 + 原因 + 计划清除批次。

11.2 **修订流程**（[MUST]）：

1. 修订须经用户确认（新增/删除条款、修改数值、调整适用范围均属修订）；
2. 改本文件头部版本号（**单点**，见文首《版本号规则》）；
3. 同步更新 `apps/frontend/scripts/check-*.mjs` 中对应的执行规则（若该条文有脚本）；
4. 同步更新 `CHANGELOG.md`，并在 PR 描述中列出「条文 ↔ 脚本 ↔ 存量迁移」三者的对应关系；
5. **禁止**在有存量违规的情况下直接开闸——须同 PR 提交豁免清单（附录 A）或迁移数据。

> 原条文为「改版本号并同步更新 `frontend-page` skill 与 `AGENTS.md` 引用」——该表述把**下位文档**当成了同步对象，而两者按文首《版本号规则》**本就不该出现版本号**，且真正的事实执行层是 `check-*.mjs` 脚本。2026-09-27 按 A 类方案 §1.2(3) 重写。

---

## §12 `data-ai-*` 标注协议（人机协作契约）[MUST]

12.1 **三属性定义**

| 属性 | 必填性 | 语义 | 取值规范 |
|------|--------|------|---------|
| `data-ai-page` | **页面根节点必填** | 页面标识，AI 定位「我在哪」 | kebab-case，`<域>-<页面>`，如 `project-list`、`issue-detail` |
| `data-ai-action` | 可交互元素必填 | 动作标识，AI 定位「能做什么」 | kebab-case，`<动词>-<对象>`，如 `create-issue`、`export-report` |
| `data-ai-entity` | 绑定实体时必填 | 实体标识，AI 定位「这是谁」 | `<entity-type>:<id>`，如 `issue:cmu8ic...`、`project:xxx` |

12.2 **覆盖要求**
- 所有 `src/**/*-page.tsx` 的**最外层容器**必须声明 `data-ai-page`；
- 页面内所有**主要动作**（提交、创建、删除、导出、审批）必须声明 `data-ai-action`；
- **同一个 `data-ai-action` 值在全仓唯一**（AI 靠它定位，重名即歧义）。

12.3 **禁止**
- 禁止把 `data-ai-*` 用在纯展示装饰元素上（稀释信噪比）；
- 禁止动态拼接 `data-ai-action` 的模板串（`` data-ai-action={`...${x}`} ``）（AI 无法穷举）；动态场景用 `data-ai-entity` 挂 id。

12.4 `check-ui-governance.mjs` 为本章的执行镜像；覆盖范围为**全部页面型文件**。

---

## §13 表单 [MUST]

13.1 **技术栈唯一**：React Hook Form + Zod。禁止手写 `useState` 校验（>3 字段的表单）。

13.2 **结构组合**（唯一写法）：

```tsx
<Field>
  <FieldLabel>必填项</FieldLabel>
  <FieldDescription>辅助说明（可选）</FieldDescription>
  <Input />
  <FieldError>{errors.x?.message}</FieldError>
</Field>
```

- 不用 `FieldSet`/`FieldLegend` 的场景：单字段表单
- 用 `FieldSet` 的场景：≥2 个语义成组的字段（如「时间范围」）

13.3 **必填标记**：必填字段的 `FieldLabel` 加 `required` 语义（`aria-required`），视觉标记用 `text-destructive` 的 `*`，**禁止只靠颜色区分**。

13.4 **错误展示时机**
- **首次**：`onBlur`（失焦）；**提交后**：`onChange`（即时消除）；
- 提交失败时，**焦点移到第一个出错的字段**；
- 错误文案由 Zod schema 提供（`z.string().min(1, '请输入名称')`），**不在组件内硬编码**。

13.5 **错误文案规范**：中文、动词开头、说明「怎么改」而非「错了」（✓「请输入名称」 ✗「名称不能为空/字段无效」）。

13.6 **a11y**：`FieldError` 必须与控件通过 `aria-describedby` 关联；`aria-invalid` 随错误态同步。

---

## §14 数字与日期格式化 [MUST]

14.1 **唯一入口**：`@/lib/format`。禁止在组件内直接调用 `toLocaleDateString` / `Intl.*` / `date-fns` 裸函数。

14.2 **日期时间**

| 场景 | 函数 | 输出示例 |
|------|------|---------|
| 列表主行 | `formatDate(d)` | `2026-09-27` |
| 时间戳（详情） | `formatDateTime(d)` | `2026-09-27 14:32` |
| 相对时间（活动流） | `formatRelative(d)` | `3 分钟前` |
| 短日期（图表轴/紧凑） | `formatDateShort(d)` | `9月27日` |
| 纯时间 | `formatTime(d)` | `14:32` |

14.3 **数字**

| 场景 | 函数 | 规则 |
|------|------|------|
| 计数 | `formatNumber(n)` | 千分位 |
| 大数 | `formatCompact(n)` | `1.2万` / `3.4M` |
| 百分比 | `formatPercent(n)` | `42.5%` |
| 金额 | `formatCurrency(n)` | 保留币种 |
| 耗时 | `formatDuration(ms)` | `1h 12m` |

14.4 **等宽数字**：ID、时间、耗时、token 数、表格数值列**必须** `font-mono tabular-nums`（防抖动的唯一手段）。

14.5 **时区**：一律按用户本地时区渲染；存 UTC。相对时间 `>7 天` 退化为绝对日期。

> **i18n 联动**：`toLocaleDateString(i18n.language)` 的调用，`@/lib/format` 须支持 locale 入参。

---

## §15 响应式 [MUST]

15.1 **断点**：沿用 Tailwind 默认，禁自定义：`sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280 / `2xl` 1536。

15.2 **最低支持宽度：1024px（`lg`）**〔已确认，见 BCD 方案 D-2〕。本产品是**桌面优先的数据密集型工具**，非移动端产品；`sm`/`md` 仅用于**窗口缩小**场景，不做手机版适配。**本节是对既有断点用法的约束基线**——`md` 以下的写法只在「窗口缩到 768-1024」时短暂生效，不承诺移动端可用性。

15.3 **断点职责固定**（不许自由发挥）：

| 断点 | 职责 |
|------|------|
| `sm` | 侧栏收起、工具栏按钮折叠为图标、表格列收缩 |
| `md` | 双栏 → 单栏、抽屉全宽 |
| `lg` | **基准态**（设计评审以此宽度为准，§1.4 暗色优先同理） |
| `xl` | 内容区最大宽度封顶（`max-w-*`），**不再增加列** |

15.4 **禁止**：自定义断点、`max-sm:` 反向写法（用 `sm:` 正序表达）、在 `lg` 以下隐藏**关键操作**（收缩为图标或进「更多」菜单，不得消失）。

---

## §16 文案 [SHOULD]

16.1 **空态一律走 `EmptyState`**（§10.6），禁止内联「暂无XX」纯文本。

16.2 **空态文案三段式**：`title`（是什么空了）+ `description`（为什么 + 怎么变不空）+ `action`（动词短语）。
- title 不带句号、不含「您」；description 一句话；action 用动词开头（「新建任务」「导入数据」）
- ✓ title「还没有任务」 desc「创建第一个任务，或从模板批量导入」 action「新建任务」
- ✗ title「暂无数据。」 desc「」 action「」

16.3 **按钮文案**：动词 + 对象（「保存」而非「确定」；「删除任务」而非「是」）；破坏性操作按钮用具体动词（「删除」而非「确定」）。

16.4 **标点**：标题/按钮/标签**不带句号**；描述/说明句**带句号**；中英文之间不强行加空格。

16.5 **错误文案**：见 §13.5。

16.6 **禁用词**：「您」「请稍候」（用具体进度）、「操作失败」（用具体原因）。

---

## §17 图表 [MUST]

17.1 **唯一实现**：`components/ui/chart.tsx`（recharts 封装）。禁直接引 recharts 原语。

17.2 **配色**：只用 `--chart-1..5`（`text-chart-1` 等）；序列顺序即色序，不得跨图乱序。深色模式必须与浅色模式视觉权重相当。

17.3 **坐标轴**：轴标签 `text-3xs`(非中文) / `text-2xs`；轴线与网格用 `border` token；**禁网格线多于 5 条**（数据密集场景靠 tooltip，不靠网格）。

17.4 **Tooltip**：必给；数值列 `font-mono tabular-nums`（§14.4）；单位随数值不随标题。

17.5 **空/错态**：图表无数据时用 `EmptyState variant="card"`（§10.6），**禁渲染一张空白坐标系**。

17.6 **可访问性**：图表必须有 `aria-label` 概括结论（如「近 7 天任务完成数上升 12%」），不依赖视觉传达信息。

---

## §18 组件测试基线 [SHOULD]

18.1 **必须测试的组件**（满足任一条件）：
- 引用数 ≥ 20 的基础组件
- 含状态逻辑 / 键盘交互 / 焦点管理的组件
- 有条件渲染分支（variant ≥ 3 或 a11y 差异）

18.2 **测试内容下限**：
- 渲染：默认态 + 每个 `variant` × 关键 `size` 组合
- 交互：点击/键盘/受控回调（`onValueChange` 被调用）
- a11y：`aria-label`/`role`/焦点可见性（§8.5 的 1/2/3/7）
- **不测样式**（className 断言脆弱，改为视觉回归或人工评审）

18.3 **禁止**：为 0 引用组件写测试（先登记，见 §10.1）；规范文档本身承认「存量失败」（测试红灯即回归）。

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

**ESLint 三规则（`design-governance/*`）的豁免登记**（2026-09-28 增补）：`no-naked-controls` / `no-visual-override` / `no-adhoc-tone` 三条 AST 规则的豁免**不走本表逐行登记**，走 `apps/frontend/design-governance.allowlist.json`（schema 与机器实现：`apps/frontend/eslint-rules/`）——因该机制的豁免粒度是**范围级**且带强制到期日（`expiresAt`，距登记日最长 90 天，过期自动失效），与本表「不计划清除」的长期边界条目语义不同。登记格式：规则（含 `*`=三条全豁免）+ 范围（相对 `apps/frontend` 的 posix 路径，`/**` 后缀按目录前缀匹配）+ `reason` + `owner` + `expiresAt`，五者缺一即整份判无效（lint 抛错，fail-closed）；文件缺失 = 零豁免。**登记文件与 `eslint-rules/allowlist.js` 必须成对改动**——只写登记不改代码等于没豁免，只改代码不写登记等于暗箱豁免（同本表序言）。转 `error` 的前提仍是存量清零：已登记豁免的范围不算存量。

| # | 范围 | 豁免规则 | 原因 | 清除计划 |
|---|------|---------|------|---------|
| A6 | `src/modules/design-system/**` | `*`（ESLint 三规则，登记于 `design-governance.allowlist.json`） | 展示页陈列 token 名与各档对照，必然出现规范禁止的形态——同 A4 的展示页属性；A4 管 `check-*.mjs` 文本层，本条把同一裁决落到 AST 层 | 90 天滚动复登记（`expiresAt` 强制）；展示页属性不变则续登 |

### A.2 交互态裁决登记（非豁免，是决策留档）

**hover 抬升阴影的 12 处处置**（D11 落地，2026-09-27 用户决策：`改用边框/背景做 hover 反馈`）。这些位置在 v2.0 前靠 `hover:shadow-md` 之类的抬升表达可交互性；唯一阴影档下无「更高一档」可去，故逐处改写（下表 10 行覆盖 12 处，`template-manager` 与 `documents-page` 各 ×2）：

> 计数订正：此前记为「11 处」，系漏算 `team-card.tsx`——它与同目录 `member-card.tsx` 是逐字相同的 `Card + transition-shadow hover:shadow-md` 形态、处置也完全一致，随行逐处核对后订正。处置口径未变，仅数量订正。

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

处置：**(a)** 条款继续留在 E 类方案文档中作为设计意图待办；**(b)** 待其配套 lint/ESLint 规则落地后，再按 §11.2 走宪法修订（改单点版本号 + 同步 `check-*.mjs` 执行规则）正式升格。


