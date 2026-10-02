---
title: PRINCIPLES.md - APM 前端设计宪法
description: apps/frontend 所有样式改动的最高依据——字阶/间距/行高/字重/阴影/动效/token 的规则正文与机器强制口径
status: active
created: "2026-08-30"
scope: apps/frontend
governance: "本文件为最高依据；下位文档 DESIGN.md（参考规格）、COMPONENTS.md（组件清单）、apps/frontend/AGENTS.md（流程/目录/命令）、各 skill 一律只引用不承载设计规则，冲突时以本文件为准"
---

# APM 前端设计宪法

**版本：v2.8（2026-10-02 增补）** — 本版新增 **§10.8「Overlays 弹窗（Dialog 套件）宽度档」**：`ui/dialog.tsx` `size` 轴补 `wide` 宽面板档（`sm:max-w-4xl`=896，多卡并排/宽表格等大组件承载），补 2xl(672) 与 full(全屏) 之间的宽弹窗谱系缺口（2026-10-02 用户裁决「大组件入 Dialog 应保留宽弹窗版本」，触发场景=信任等级三卡面板）；default 档既有 className 微调事实档（lg/xl/2xl，存量 60+ 处）确认为既成标准不追溯，新增代码禁 3xl 及以上手写任意档。强制方式：`评审`，机器化候选（白名单外任意值探测）已登记条文批注。**版本：v2.7（2026-10-01 增补）** — 本版新增 **§21「列表与清单渲染性能（阀门）」**：CAP-B-10（2026-10-01 用户裁决「列表性能提升为设计标准，系统级阀门」）四考核点入宪——渲染窗口律（content-visibility + 渐进挂载，阈值 120/批 60）、observer 密度律（行渲染器禁逐行数据 hook，单元格族 Provider 收编 + 只读降级）、渲染期开销律（右键菜单事件期构建 + 行 memo）、数据窗口律（不静默截断 + Dev 预算告警 300）。强制方式：四条均为 `组件`（DataList/单元格族内置，消费方零成本生效）+ `评审`（阈值）；§11.2 第 3 步同步项——本章无独立 check 脚本，阀门载体即组件本体与 GAP-T-55 行为级用例，机器化候选（逐行数据 hook AST 探测）已登记条文批注。**版本：v2.6（2026-09-30 修订）** — 字阶 8 档升 9 档：新增 `text-md` = 15px（Linear 对标列表标题档），由 Linear 呼吸感批的任意值白名单特例 `text-[15px]` 经晨会裁决升格（§3.1 表、§十二 D3 行同步；`--text-md` 入 `src/index.css` @theme，twMerge 对 t-shirt 尺码 `md` 天然识别无需登记）。**版本：v2.5（2026-09-29 增补）** — 本版新增 **§20「布局与组合」（容器层）**：F 类方案（`docs/design/修改方案-F类-布局与组合-2026-09-28.md`）九条零迁移 `[MUST]` 条文入宪（浮层串行律、页面居中容器禁手写、标题图标分层、弹窗内禁 SectionCard、表单容器铁律、卡片嵌套三律、视图形态可用性律、按钮间距唯一律、窗口二态制）。§11.2 第 3 步同步项：其中六条由 `f-class-governance` ESLint 插件与 `check-spacing-governance.mjs`（space-x 封禁）机器强制，两条（20.7 / 20.9）为 `评审` 强制并登记机器化候选；存量违规经七规则全量扫描为 **0**（§11.2 第 5 步满足）。同版修订 **§10.4**：Sheet 定位收窄为内容展示/日志流，「轻量确认/短表单」档的「短表单」二字废除（表单容器归 §20.5）。**章号避让**：F 类取 §20——19.x 已在附录 A.3 登记为 E 类待升格账命名空间（2026-09-29 收窄为 19.1/19.5/19.6），不占用。**版本：v2.4（2026-09-28 增补）** — 本版新增 §4.5 的**chip / toggle 胶囊例外**：主条「按钮一律 `rounded-md`」与仓内既有一批胶囊形 chip / toggle 控件长期冲突，经 2026-09-28 裁决承认该形态**合法**（零视觉变更、不清退），同时**限定语义、禁止泛化**（普通动作按钮仍一律 `rounded-md`）。本条**无对应 `check-*.mjs` 执行规则**——圆角维度自始没有脚本，§11.2 第 3 步无可同步项（已在 `CHANGELOG.md` 声明）。**版本：v2.3（2026-09-27 修正）** — 本版修正 v2.2 的两处条文缺陷。①**§8.4 的 z 命名空间键名写错**：原稿 token 列写作 `--z-base`/`--z-modal`，实测 Tailwind v4 的 z 工具只认 `--z-index`，按字面落地会**静默生成 0 CSS**——与 §7.1 时长陷阱同型（`duration-<name>` 读 `--transition-duration-<name>`），故把「token 键名 ≠ 工具类前缀」立为通则并要求构建产物 + `getComputedStyle` 双向实证。②**§4.5 的按钮档位自相矛盾**：sm 行「紧凑按钮」与 md 行「控件默认（按钮…）」两处都覆盖按钮，经 2026-09-27 裁决统一为「**按钮一律 `rounded-md`，不因尺寸降档**」，sm 收窄为「控件内嵌块」。v2.2（2026-09-27 补条文）— 本版把 D 类十二条文写入正文：§4.5 圆角五档 + 胶囊、§8.4 层级（z-index）七档、§8.5 无障碍最低要求、§10.6 三态选型决策树、§10.7 组件 API 约定、§12 `data-ai-*` 标注协议、§13 表单、§14 数字与日期格式化、§15 响应式、§16 文案、§17 图表、§18 组件测试基线（条文来源：`docs/design/修改方案-BCD类-2026-09-27.md` 第三部分 D 类）。v2.1（2026-09-27 权威收口）— 本版按 A 类修改方案 §1.2(1)(3) 重写「地位」段（删除「与 COMPONENTS.md / AGENTS.md §3 并列」的表述——它把下位文档抬成同级真相源，是 A3/A4/A6/A7 四条矛盾的制度根源），新增《效力链》与《版本号规则》，并重写 §11.2 修订流程。v2.0（2026-09-27）语义化 token 层落地：字阶/阴影/字重/行高/动效全面 token 化并配机器强制，token 名称与数值彻底解耦（`text-10` → `text-3xs`）。v1.2（2026-09-26 增补 §10.5）；v1.1（2026-09-25 增补 §10.4）；v1.0（2026-08-30 用户确认 D1-D9 后转正）。
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
| D3 | 字阶 | 9 档语义阶梯 `text-3xs/2xs/xs/sm/md/base/lg/xl/2xl`，**名称与 px 解耦**（§3）**〔v2.6 修订：8 档增 `text-md`=15px 列表标题档，2026-09-30 晨会裁决；原为 `text-xs/sm/10/11` 四档+数字直读〕** |
| D4 | 中文字体 | 思源黑体（Noto Sans SC），自托管（§2） |
| D5 | 中文最小字号 | ≥ `text-xs`(12px)，`text-3xs/2xs` 仅非中文（§2.4）**〔v2.0 改名〕** |
| D6 | 字重 | 只留 400/500/600（§2.3） |
| D7 | 间距奇数档 | 冻结禁新增，存量随批 1 迁移（§4.1） |
| D8 | mock | 全部下沉 msw 网络层，生产禁用（§9） |
| D9 | 评审基准 | 暗色优先（§1.4） |
| D10 | 阴影 | **全站唯一投影档 `shadow-xs`**；`shadow-none` 为重置档；其余具名档与裸 `shadow` 一律封禁（§3.6）〔v2.0 新增〕 |
| D11 | hover 抬升 | 唯一阴影档下 hover **不再抬升阴影**，反馈改由边框/背景/位移/环色承载（§3.6）〔v2.0 新增〕 |
| D12 | 动效 | 时长白名单 120/180/240ms；token 命名空间必须是 `--transition-duration-*`（§7.1）〔v2.0 新增〕 |
| D13 | 布局与组合（容器层） | F 类九条入宪 **§20**（浮层串行/居中容器/标题图标/弹窗禁 SectionCard/表单容器/卡片嵌套/形态可用性/间距唯一/窗口二态）；Sheet 定位收窄（§10.4）；章号避让——19.x 留给 E 类待升格账（附录 A.3）（§20）〔v2.5 新增〕 |

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

3.1 只允许以下 9 档，逐档角色固定。**token 名与 px 值彻底解耦**——名字是语义档名，不是像素读数（v2.0 起 `text-10`/`text-11` 已废止，禁止回流）：

| token | px | 角色 |
|-------|----|----|
| `text-3xs` | 10 | 徽标内数字、图表轴、微元数据（非中文） |
| `text-2xs` | 11 | badge、辅助标签、密集元数据（非中文正文） |
| `text-xs` | 12 | UI 小字基准：列表次要行、属性值、小按钮；中文正文下限 |
| `text-sm` | 14 | **全站基准**：正文、列表主行、输入框、表单 |
| `text-md` | 15 | 列表标题档（Linear 对标）：DataList 行标题、列表主标题行；sm 与 base 间唯一中间档（2026-09-30 晨会裁决由任意值白名单升格） |
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

10.4 **Overlays 抽屉（Sheet 套件）宽度与标题栏**（v1.1 增补，2026-09-25 用户确认；〔v2.5 修订：定位收窄为内容展示/日志流，「短表单」档废除——表单容器归 §20.5，2026-09-29〕）：侧滑内容详情/日志流一律用 `ui/sheet.tsx`（base-ui 配方，§10.1 唯一实现）；**Sheet 不承载实体表单**。

- **宽度三档**（`side="right"/"left"`，禁任意值；窄屏一律 `w-full` 全宽）：
  - 轻量确认：`sm:max-w-sm` ~ `sm:max-w-md`（384~448）
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

10.8 **Overlays 弹窗（Dialog 套件）宽度档**（v2.8 增补，2026-10-02 用户裁决「大组件入 Dialog 应保留宽弹窗版本」——背景：信任等级三卡面板挤 `max-w-3xl` 孤例暴露 2xl~full 谱系缺口）：居中弹窗一律 `ui/dialog.tsx`（base-ui 配方，§10.1 唯一实现），宽度走 `size` 轴封闭词表，**禁任意值**（窄屏一律 `w-full`，`max-w-[calc(100%-2rem)]` 兜底）：
- `default`：基线档 `sm:max-w-md`（448）。既有事实微调档 `sm:max-w-lg`（512）/ `sm:max-w-xl`（576）/ `sm:max-w-2xl`（672）允许消费方 className 覆盖（全库存量 60+ 处不追溯，仍属既成标准而非新增任意值）；
- `wide`：**宽面板档** `sm:max-w-4xl`（896）——多卡并排网格、宽表格、富面板等大组件承载，补 2xl(672) 与 full 之间的宽弹窗缺口；
- `full`：全屏工作面（图表精读/沉浸承载）。

选型序：内容装得下不升档；**三列及以上卡网格 / 数据表必须 `wide` 起**（三列竖卡在 2xl 内每列 <220px 必然挤压断行）。表单容器铁律见 §20.5。强制方式：`评审`（§11.2 第 3 步机器化候选：DialogContent className 上 `sm:max-w-*` 白名单外任意值探测）。

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

## §20 布局与组合（容器层）[MUST]

> 条文来源：`docs/design/修改方案-F类-布局与组合-2026-09-28.md`（2026-09-29 用户裁决升格，J1–J18 全收口）。本宪法其余章节管**原子层**（字阶/间距/圆角/颜色/动效/三态），本章管**容器层与组合层**——页面骨架、重量级容器的规格档位、组件与组件之间的关系律。完整条文、现状证据与存量迁移清单以方案文档为准，本章收录可长期执行的规则本体。强制方式标注：`lint` = `f-class-governance` ESLint 规则或 `check-spacing-governance.mjs`；`评审` = 人工清单（机器化候选见批注）。

20.1 **浮层串行律**：浮层（Dialog/Sheet/Drawer）相互嵌套禁止（含同类与跨类）；需要二次确认一律在其上叠加 `AlertDialog`（走 Portal 同层，§8.4 的交互面具体化）。`lint`

20.2 **页面居中容器禁手写**：页面内禁止手写 `mx-auto max-w-*` 重包一层居中容器——宽度一律由母版分发：L1 列表母版用 `PageShell` variant 四档（`full` / `wide` max-w-7xl / `standard` max-w-5xl / `reading` max-w-4xl，全站唯一宽度阶梯）；L2 详情母版（如 project-detail-frame）结构自管双栏、不走 PageShell 居中滚动，其主栏宽度同表分发。`lint`

20.3 **标题图标分层**（不做全站一刀切）：
- L1 页面标题**必带图标**：`PageHeader` 的 `icon` 槽必填，实体页一律取 `entity-icons` 唯一源（禁页面自选实体图标）；唯一豁免 = Loading 骨架头与数据缺失异常态头。`lint`
- L2 详情页标题带实体图标：`SubPageToolbar` 的 `titleIcon` 槽渲染实体类型图标（同源 entity-icons）。`评审`
- 区块卡（SectionCard）默认不带，配置/系统类区块可带；统计卡（StatCard）必带；弹窗/面板标题不带。`评审`

20.4 **弹窗内禁 SectionCard**：SectionCard 是页面区块卡原语，弹窗内子区块用微卡（`rounded-lg border bg-background px-2.5 py-2`，文档流型）或分区骨架（工作台型）。`lint`

20.5 **表单容器铁律**：实体新增/修改（表单级：一次变更 ≥2 字段且有显式提交边界）唯一容器是模态 Dialog。豁免：单项修改（单字段值变更/行内热编辑/单字段快捷创建）、内容编辑器原位编辑（textarea/Markdown/代码）、画布选中项 Inspector（限定=依附画布选中态 + 显式保存 + 不承载创建）；设置/偏好常驻表单不豁免，一律迁 Dialog；搜索/筛选表单不在约束范围。**Sheet 不承载实体表单**（§10.4 同步修订）。`lint`

20.6 **卡片嵌套三律**：①同档禁嵌——`Card` 默认档内禁直接嵌另一个默认档 `Card`；②跨档须降权——区块内子卡必须 `size="sm"` + 视觉降权（border 或底色区分，禁加投影，§3.6）；③深度 ≤2——子卡内不再嵌卡，第三层内容改用 DataList 行 / PropertyRow 承载（与 §4.5「同屏圆角 ≤2 档」互为表里）。`lint`

20.7 **数据视图形态可用性律**：页面视图四形态各有唯一载体与选用判据——list=`DataList`（扫视定位）/ table=`DataTable`（精确读值与批量）/ kanban=`BoardView`（状态流转）/ gantt=`GanttChart`（时间调度）；按数据性质开形态、禁四档全开：无分组/状态字段禁 kanban，无日期字段禁 gantt；视图切换器唯一实现 = `ToolbarRow` 的 `viewStyle`。`评审`（机器化候选：视图配置字段的形态可用性校验）

20.8 **按钮间距唯一律**：同组相邻按钮 `gap-2`（8px）唯一档；`space-x-*` 全库封禁（负向 `-space-x-N` 叠层为合法惯用法）；footer 对齐禁 `ml-auto` 手摊（机器化候选：footer 语境 AST）。`lint（space-x 已封）/评审（ml-auto）`

20.9 **窗口二态制**：可变窗口唯一形态 = **默认态 + 最大化/还原二态切换**（放大档 `w-[min(96vw,1040px)] h-[min(84vh,760px)]` / 全屏档 `w-dialog h-dialog-screen`，同一组件内禁混用）；禁拖拽 resize、禁引入拖拽分栏库（react-resizable-panels / allotment 等）——唯一例外是数据拖拽（kanban 卡片 @dnd-kit、gantt 条改日期，拖的是数据不是容器）；禁最小化到栏/收起为胶囊形态（需要常驻的走 RightSidebar）。`评审`

---

## §21 列表与清单渲染性能（阀门）[MUST]

> 条文来源：2026-10-01 任务列表页卡顿调研 + 用户裁决「提升为设计标准，运用到每个列表清单加载，系统级设置」（CAP-B-10）。§10 管组件选型与治理，§20 管容器与组合，本章管**运行时渲染成本**——数据量不确定的清单如何保证进页不卡。背景实测：全局任务页 609 行一次全量挂载 × 每行 6~7 个 react-query observer + 4 个 menu 根 + 渲染期右键菜单构建，SQL（26ms）与传输（514KB）均非瓶颈，卡顿纯前端渲染成本。强制方式标注：`组件` = 阀门内置 DataList / 单元格族，消费方零成本自动生效；`评审` = 阈值与例外人工裁决（机器化候选：行渲染器内逐行数据 hook 的 AST 探测）。

21.1 **渲染窗口律**：清单一次同步挂载的行数必须有界。`DataList` 内置双阀门（`组件`）：①行容器 `content-visibility:auto` + 按行高档位给 `contain-intrinsic-size`（离屏行免布局/绘制；DOM 保留，Ctrl+F/锚点/无障碍不丢）；②渐进挂载——超过阈值（**120 行**）的清单首屏只挂 120 行，其余按 **60 行/帧** idle 分批补齐，未挂区以行高档位估算高度的占位撑住滚动条。自建滚动列表（不经 DataList 的）同等义务。阈值调整属修订（§11.2）。`评审`

21.2 **observer 密度律**：行渲染器（`renderLeading` / `renderTrailing` / 行组件内部）**禁止逐行实例化数据 hook**（useQuery / useMutation / 派生查询）——609 行 × 7 hook = 4300 个 observer 的创建与级联重渲染是卡顿主因。候选数据（成员 / 类型 / 标签 / 里程碑等）在**列表级取一次**经 props 或 context 下发。工单单元格族（cell-editors）以 `IssueCellDataProvider` 为唯一收编口：未挂 Provider 时单元格**只读降级**（渲染 children 不挂编辑器），新消费方禁走只读形态。`评审`

21.3 **渲染期开销律**：行级派生数据禁止在 render 期构建——右键菜单数组在 contextmenu **事件期**构建（`ContextMenu` 的 `getItems` 惰性口），每轮渲染 609 次全量菜单重建即为违例先例；行组件 memo 化，DataList 内部状态（选中/键盘光标/分组折叠/渐进预算）变化时未受影响行必须跳过重渲染。`评审`

21.4 **数据窗口律**：「滚动全量模式」（pageSize 拉满一页等效全量）是产品选择，**不得静默截断数据**（截断=撒谎）；清单超渲染预算（Dev 模式 **>300 行**）时 DataList console 告警一次，提示走筛选/分组/分页而非裁数据。服务端 pageSize 上限属 openapi 契约变更，不在组件层私自设限。`组件`（告警）

21.5 **性能回归义务**：改动 DataList / 单元格族阀门行为须过行为级用例（GAP-T-55：渐进挂载分批到位 / 测试环境短路 / 事件期菜单可达 / memo 跳过 / Provider 收编与只读降级 / 预算告警）；新清单消费方接 `DataList` 即自动合规，自建列表须在 PR 描述附本章四考核点自查。`评审`

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
| A8 | `components/semantic/theme-mode-card.tsx` | 颜色（`check-palette.mjs`，**整文件粒度**——脚本的 `EXEMPT` 只提供整文件放行，本行覆盖范围即整个文件） | ① **预览缩略图的字面色**（`bg-white` / `bg-zinc-950` / `bg-gray-700`）：预览要回答「日间 / 夜间分别长什么样」，必须与当前主题无关——改成随主题走的 token，则浅色主题下画不出深色预览块，预览即失真。性质同 A5 中「外观设置的主题预览缩略图」；该件 2026-09-29 从 `appearance-section.tsx` 提取为独立语义组件，故单列而不并入 A5，使两条范围在审计时各自可见。② **顺带覆盖**选中徽标的 `text-white`（`bg-accent-blue` 底白字，与 C2 legacy 白名单 (b) 组同类）——提取时按「不夹带视觉变更」原样搬运；改配对的 `accent-foreground` 在**浅色主题下是近黑色**（`240 5.9% 10%`），会实打实换掉观感，故不属零视觉变更，未做 | ① 不计划清除——是预览语义的边界，不是债务（范围随组件文件走）。② 待配套前景 token 补齐后收窄（口径同 C2 legacy (b) 组）——届时要么把本行拆成「预览字面色」与「徽标前景」两条，要么给脚本补 per-token 粒度；**在此之前②是登记在案的越界，不是已批准的设计** |

> **A2+A4 曾导致一次方案否决**：A 类方案 §3.6 第 3 步建议设 `--shadow-*: initial` 让违规档「物理上无法生成 CSS」。经裁决**不实施**——命名空间闭合会连带抹掉 A2/A4 已豁免的投影，把「豁免」变成静默破版。**物理闭合与豁免机制不可并存**，取「豁免 + lint 拦截」（§3.6）。同一原因，`check-palette.mjs` 中的 `RAW_SHADOW` 系列正则已整体删除，阴影治理单点收敛到 `check-spacing-governance.mjs`。

**ESLint 三规则（`design-governance/*`）的豁免登记**（2026-09-28 增补）：`no-naked-controls` / `no-visual-override` / `no-adhoc-tone` 三条 AST 规则的豁免**不走本表逐行登记**，走 `apps/frontend/design-governance.allowlist.json`（schema 与机器实现：`apps/frontend/eslint-rules/`）——因该机制的豁免粒度是**范围级**且带强制到期日（`expiresAt`，距登记日最长 90 天，过期自动失效），与本表「不计划清除」的长期边界条目语义不同。登记格式：规则（含 `*`=三条全豁免）+ 范围（相对 `apps/frontend` 的 posix 路径，`/**` 后缀按目录前缀匹配）+ `reason` + `owner` + `expiresAt`，五者缺一即整份判无效（lint 抛错，fail-closed）；文件缺失 = 零豁免。**登记文件与 `eslint-rules/allowlist.js` 必须成对改动**——只写登记不改代码等于没豁免，只改代码不写登记等于暗箱豁免（同本表序言）。转 `error` 的前提仍是存量清零：已登记豁免的范围不算存量。

| # | 范围 | 豁免规则 | 原因 | 清除计划 |
|---|------|---------|------|---------|
| A6 | `src/modules/design-system/**` | `*`（ESLint 三规则，登记于 `design-governance.allowlist.json`） | 展示页陈列 token 名与各档对照，必然出现规范禁止的形态——同 A4 的展示页属性；A4 管 `check-*.mjs` 文本层，本条把同一裁决落到 AST 层 | 90 天滚动复登记（`expiresAt` 强制）；展示页属性不变则续登 |
| A7 | `src/shared/components/markdown-view.tsx`、`src/shared/mdx/components/mdx-table.tsx` | `no-naked-controls`（登记于 `design-governance.allowlist.json`，2026-09-28 存量清剿轮） | 均为**内容渲染**场景：前者是 react-markdown GFM 任务清单 checkbox 的只读展示（`- [x]` 语法产物，非交互控件）；后者是 MDX prose 表格（文档正文 markdown 表格，非 UI 数据表格）——替换原子组件会破坏 markdown/prose 语义渲染 | 90 天滚动复登记（`expiresAt` 强制）；渲染属性不变则续登 |

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

**E 类 §19（`修改方案-E类-2026-09-27.md`）未写入本宪法，且入宪范围已收窄（2026-09-29，E 类方案 §七之十一 路线裁决）**。原 19.1–19.6 均为 `[MUST]` 待升格，但当前**没有任何机器强制可覆盖它们**；而 E 类自身规则要求「没有机器强制的 `[MUST]` 不写进宪法」。同日路线裁决后：**19.2「禁止裸组件」与 19.3 轴一 PEC 随「裸组件清剿」路线废止，永不入宪**；**19.4 由「变体优先」修订为「语义组件优先」**（raw/semantic 分层、原子组件变体轴冻结——升格意向以修订后口径为准，同样待机器强制）；**19.1 / 19.5 / 19.6 维持原状**。

处置：**(a)** 仍有效条款留在 E 类方案文档中作为设计意图待办；**(b)** 待其配套 lint/ESLint 规则落地后，再按 §11.2 走宪法修订（改单点版本号 + 同步 `check-*.mjs` 执行规则）正式升格。ESLint 三条 `design-governance` 规则维持 `warn`：`no-naked-controls` 重定位为「裸控件盘点器」（分层改造摸底工具，非禁令），三条转 `error` 的前提（存量清零）已随路线废止**永久撤销**。

> 编号占用说明（2026-09-29）：19.x 编号继续为本账保留；F 类九条已同日入宪 **§20「布局与组合」**（v2.5），未占用 19.x。


