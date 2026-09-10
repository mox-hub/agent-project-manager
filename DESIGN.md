---
title: DESIGN.md - APM 全局设计系统规范与组件架构标准
description: APM 双表面（人类控制面 + AI 执行面）前端设计系统权威技术规格书——低饱和多色色阶、外舒内紧卡片、多端字阶密度、系统化动效理念与全量组件清单
version: 2.0.0
status: proposal-for-approval
branch: feat/design-system-redesign
created: "2026-09-10"
scope: apps/frontend, apps/desktop
governance: "docs/design/PRINCIPLES.md 并入升级为本文件"
---

# APM 全局设计系统规范与组件架构标准 (v2.0)

> **本文件地位**：`apps/frontend` 与 `apps/desktop`（Tauri）界面设计与样式重构的**全仓唯一最高权威标准**。
> 本规范由 `docs/design/PRINCIPLES.md` (v1.0) 升级演进而来，经多轮讨论深度沉淀，专门解决：
> 1. **色彩克制**：摒弃纯黑白灰冷淡风与刺眼彩虹糖，建立**低饱和度多色域灰调色阶系统**。
> 2. **空间承载**：推行**「外舒内紧」（Respiratory Outside, Compact Inside）卡片分割体系**，提高视口信息吞吐量。
> 3. **多端字体**：建立适配 Web 与 Tauri 桌面壳（不同 DPI 缩放）的**双层字阶与动态密度模式**。
> 4. **AI 多样化承载**：构建 **5 类高信息密度 AI 结构化卡片矩阵**，告别简单卡片。
> 5. **系统化动效**：确立**微交互、状态展开、AI 思考脉冲与多层模态**的完整动效设计哲学与白名单。
> 6. **双表面组件治理**：全量重新整理组件资产，**全面标识「人类控制面组件 [HUMAN]」与「AI 执行面组件 [AI]」**，并列出风格不统一组件的整改路线。

---

## 目录

1. [核心设计哲学与双表面定位](#一核心设计哲学与双表面定位)
2. [低饱和多色域灰调色彩系统](#二低饱和多色域灰调色彩系统)
3. [布局与卡片分割体系外舒内紧](#三布局与卡片分割体系外舒内紧)
4. [多端自适应字体与排版主次](#四多端自适应字体与排版主次)
5. [系统化动效设计理念与白名单](#五系统化动效设计理念与白名单)
6. [双表面组件全量清单与属性标识](#六双表面组件全量清单与属性标识)
7. [风格不统一组件整改与淘汰路线](#七风格不统一组件整改与淘汰路线)
8. [质量门禁与实施推进规则](#八质量门禁与实施推进规则)

---

## 一、核心设计哲学与双表面定位

### 1.1 设计主轴
APM 是一个 **AI 驱动的高吞吐项目管理系统**。我们的产品主轴是：
> **「AI 同事是手段，工程治理是目的」** —— 界面必须让小白团队能够清晰感知工程质量、验收门禁与契约合规，同时让熟练工程师拥有如代码编辑器般的极速扫视感。

### 1.2 双表面架构视觉映射（Dual-Surface Cohesion）
系统在视觉与交互上天然承载两种主体形态：
* **人类控制面（Human Control Plane [HUMAN]）**：
  * **设计气质**：严谨、秩序、极低视觉噪点、精准可触达。
  * **核心诉求**：任务分配、泳道看板、甘特排期、审批确认、验收打钩、工件审查。
* **AI 执行面（AI Execution Plane [AI]）**：
  * **设计气质**：透明、自治、动态可解释、高信息密度承载。
  * **核心诉求**：深度思考链展开、代码 Diff 审查、CLI 终端流、多 Agent 协作交接、Token/工时双轨损耗。
* **双表面交汇门禁（Hybrid Governance Gate [HYBRID]）**：
  * 决策收件箱（Decision Cards）、验收门禁（Acceptance）、契约绑定（Contract Bindings）。

---

## 二、低饱和多色域灰调色彩系统

### 2.1 用色铁律
1. **彻底告别「高饱和彩虹色」与「纯单色黑白灰」**：
   * 严禁在界面上大面积使用刺眼的高彩度色块（如鲜红、荧光绿、高饱和艳橙）。
   * 严禁全站变成非黑即白的单调灰阶（导致多业务域与状态无法瞬时扫视）。
2. **彩色面积占比 ≤ 10%**：
   * 90% 的页面由精细微调的中性阶梯支撑，彩色**仅用于状态指示、执行身份与不可逆警示**。
3. **低饱和浅底（Subtle Tint）优先**：
   * 状态背景一律使用 6%~10% 透明度浅底，配合 18%~22% 半透明弱边框与 65%~75% 适度对比正文字，严禁浓墨重彩。

### 2.2 中性明度 4 级阶梯（Luminance Levels）

| 层级 | Token 名称 | 暗色（Dark 基准） | 亮色（Light） | 视觉角色 |
|---|---|---|---|---|
| **L1 画布底** | `--background` | `hsl(240, 10%, 4%)` (`#09090B`) | `hsl(0, 0%, 98%)` (`#FAFAFA`) | 全局主背景，沉静无杂质 |
| **L2 卡片面** | `--card` | `hsl(240, 8%, 7%)` (`#111114`) | `hsl(0, 0%, 100%)` (`#FFFFFF`) | 主卡片、面板、独立内容容器 |
| **L3 嵌层底** | `--content-bg-secondary` | `hsl(240, 6%, 10%)` (`#18181C`) | `hsl(240, 5%, 96%)` (`#F4F4F5`) | 嵌套代码块、输入框、已折叠工具条 |
| **L4 微边框** | `--border` / `--border-subtle` | `hsla(240, 5%, 84%, 0.12)` | `hsla(240, 6%, 10%, 0.10)` | 1px 细微半透明分割线，不抢主体 |

### 2.3 5 组低饱和语义色系（Muted Palette）

每个色系均严格调谐至低饱和度，并配备 4 级微色阶：

```
[Level 1: 8% Tint Fill]   → 用于胶囊底色 / 选中高亮行
[Level 2: 20% Border]     → 用于聚焦微边框 / 标签外框
[Level 3: 70% Foreground] → 用于标签正文 / 次强调图标
[Level 4: 90% Solid Core] → 用于高亮核心点 / 关键告警点
```

| 色系名称 | 语义归属 | 色相与饱和度 (HSL) | 经典消费场景 |
|---|---|---|---|
| **冷灰蓝<br>(Slate Blue)** | 常规交互、工单主流程、信息提示 | `H: 216°, S: 36%, L: 58%` | 进行中任务、操作链接、主按钮态、常规通知 |
| **薄荷灰绿<br>(Muted Emerald)** | 验收通过、Done、CI 正常、健康 | `H: 156°, S: 32%, L: 44%` | 已完成工单、测试通过徽章、低负载可用状态 |
| **暖灰琥珀<br>(Muted Amber)** | 待审决议、中优先级、临界警告 | `H: 38°, S: 45%, L: 52%` | 待决审批胶囊、接近排期截止、资源受限提示 |
| **灰粉砖红<br>(Brick / Crimson)** | 阻断门禁、高危冷却、严重缺陷 | `H: 358°, S: 46%, L: 54%` | 阻断状态、Bug 严重度 Critical、破坏性删除确认 |
| **烟熏紫<br>(Smoky Violet)** | **AI 专属**（思考链、Agent 工具流） | `H: 265°, S: 32%, L: 60%` | AI 同事标识、思考脉冲点、工具调用胶囊、智能建议 |

---

## 三、布局与卡片分割体系：外舒内紧

### 3.1 核心公式
> **密度来自单元格（紧凑内边距、高密内容组装），舒适来自区间（透气的外边距、清晰的区块网格）。**
> 严禁用卡片内部的无意义大空白来制造虚假的“高级感”。

### 3.2 外呼吸感规范（Outer Spacing）
* **页面外边距**：
  * 水平边距：`px-4`（移动/小窗 16px）~ `px-6`（桌面宽屏 24px）。
  * 顶栏/工具栏与主内容垂直间距：`gap-4`（16px）。
* **卡片间距（Card Grid Gap）**：
  * 卡片阵列（如看板列、办公室同事卡网格）：统一采用 **`gap-3`（12px）至 `gap-4`（16px）**。
  * 区块之间（如概览页各独立 Section）：垂直留白保持 **`space-y-6`（24px）**。
* **卡片外框视效**：
  * 采用 **1px 半透明细边框（`border border-border/60`）**。
  * 取消厚重投影，仅在 Hover 或悬浮层允许极轻微环境阴影（`shadow-xs: 0 1px 2px 0 rgba(0,0,0,0.05)`）。

### 3.3 内紧凑高密规范（Inner Padding）

彻底纠正此前 `Card` 默认 `p-6`（24px）导致的严重空间浪费：

| 卡片级别 | 内边距规范 (Tailwind) | 像素尺寸 | 适用组件与场景 |
|---|---|---|---|
| **标准独立卡片<br>(Standard Card)** | `p-3.5` ~ `p-4` | 14px ~ 16px | `Card`、`SectionCard`、独立统计模块、文档预览卡 |
| **嵌套/子卡片<br>(Compact Child Card)** | `p-2.5` ~ `p-3` | 10px ~ 12px | 工单看板卡（Board Card）、AI 工具调用卡、属性小分组 |
| **微型内联胶囊<br>(Micro Capsule Card)** | `px-2 py-1` ~ `px-2.5 py-1.5` | 8~10px 宽 / 4~6px 高 | 思考折叠核、CLI 步骤条、状态胶囊、双轨成本条 |

* **卡片头部（CardHeader）紧凑化**：
  * 压缩 CardHeader 与 CardContent 的垂直空隙至 **`gap-2`（8px）**。
  * 标题旁图标统一规格：`size-4`（16px），与文字基线严格居中对齐。

### 3.4 页面级规格与留白体系标准（Page Shell Profile Variants）

为了根治页面宽度各自为政、大屏拉扯表单、以及留白参差不齐的问题，全站统一依托 `PageShell` 页面根容器与子页规范划分为 **4 类标准页面规格及子页主栏约束**：

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 全宽吞吐型 (variant="full", 100% 视口，px-6~10 呼吸留白)   │
│    看板列 · 工单列表 · 甘特图 · 办公室大厅 · 验收流水 · 文档资产库  │
├─────────────────────────────────────────────────────────────┤
│ 2. 概览聚焦型 (max-w-7xl ~1280px，居中呼吸留白)               │
│    工作台仪表盘 · 项目仪表盘概览 · 项目二级母版 · 效能分析大屏   │
├─────────────────────────────────────────────────────────────┤
│ 3. 舒适居中型 (variant="standard", max-w-5xl ~1024px)        │
│    设置中心所有子页 · 核心配置(角色/状态/标签) · 个人档案       │
├─────────────────────────────────────────────────────────────┤
│ 4. 阅读聚焦型 (variant="reading", max-w-4xl ~896px)         │
│    文档正文阅读 · 帮助中心 · 契约与日志审阅                   │
└─────────────────────────────────────────────────────────────┘
```

| 规格名称 | 容器宽度约束 | 内边距规范 (`padded={true}`) | 典型消费页面 | 交互与视觉目标 |
|---|---|---|---|---|
| **全宽吞吐型<br>(Full / Data-Dense)** | `w-full`（全宽 100%） | 水平 `px-6 sm:px-8 lg:px-10`<br>垂直 `py-4 sm:py-5` | `/app/issues`（工单列表/看板）、`/app/office`（办公室大厅）、`/app/acceptance`（验收门禁）、`/app/documents`（文档列表） | 充分释放屏幕横向空间，配合舒适的左右渐进留白，使首尾列卡片不再贴死屏幕边缘，多列看板横向排列不拥挤，高密表格完整展示字段。 |
| **概览聚焦型<br>(Overview / Dashboard)** | `max-w-7xl mx-auto w-full`<br>(~1280px) | 水平 `px-6 sm:px-8 lg:px-10`<br>垂直 `py-6 sm:py-8` | `/app/dashboard`（工作台仪表盘）、`ProjectDetailFrame`（项目概览/工单/里程碑二级页）、`/app/analytics`（效能分析） | 在宽屏下有效收敛视觉重心，解决首屏 KPI 与图表横向无节制散漫拉扯的问题，左右留出宽屏聚焦呼吸带。 |
| **舒适居中型<br>(Standard / Centered)** | `max-w-5xl mx-auto w-full`<br>(~1024px) | 水平 `px-4 sm:px-6`<br>垂直 `py-6 sm:py-8` | `/app/settings/*`（外观/模型/Git/密钥等所有设置子页）、角色/状态管理、个人中心 | 杜绝宽屏下拉长表单与开关，行长保持最舒适扫视距离（≤ 80 字符），卡片分组井然有序。 |
| **阅读聚焦型<br>(Reading / Document)** | `max-w-4xl mx-auto w-full`<br>(~896px) | 水平 `px-6 sm:px-8`<br>垂直 `py-8 sm:py-10` | `/app/documents/:id`（文档阅读页）、`/app/help`（帮助中心）、`/app/contract`（契约查看） | 遵循最佳长文本人机工程学（35~45 汉字/行），上下留白透气，消除长时间审阅疲劳。 |

* **二级/三级详情页主栏约束（Detail Pages Main Column）**：
  * 对于带有右侧属性侧栏（320px/360px）的二级与三级详情页（如工单详情 `TaskDetailPage`、缺陷详情 `BugDetailPage`、验收门禁详情 `AcceptanceDetailPage`、成员详情 `MemberDetailPage`、团队详情 `TeamDetailPage`、仓库详情 `RepositoryDetailPage`）：
  * **结构规范**：保持全视口高度与外部贴边原生滚动条（`overflow-y-auto`），主内容区采用 `max-w-4xl mx-auto w-full`（复杂验收/仓库流采用 `max-w-5xl`）居中收敛，避免超大屏下主栏描述行长过长引起视觉疲劳，同时保持主次双栏的紧凑平衡。
* **嵌套治理铁律**：页面**严禁**在 `PageShell` 内部重复嵌套多层自创的 `p-6` 或手动 `max-w-5xl mx-auto`，一律由 `PageShell variant="..."` 统一分发接管。

---

## 四、多端自适应字体与排版主次

### 4.1 多端环境挑战与自适应机制
本项目需同时跑在 **Web 浏览器** 与 **Tauri 桌面壳（Windows WebView2 / macOS WebKit）**。针对 Windows 笔记本多发的高 DPI 缩放（125% / 150%）问题：
1. **双层字阶分工**：
   * **长文本阅读正文**（文档、长描述、讨论评论）：**`14px`（`text-sm`）**，行高 `leading-relaxed`（1.6），保障长时间阅读舒适度。
   * **卡片高密数据区**（工单列表、属性键值、AI 工具流、表格行）：**`13px`（`text-13`）**，行高 `leading-snug`（1.375），兼顾极致密度与清晰度。
2. **动态密度模式（Density Mode）**：
   依托 `index.css` 的 `--font-size-scale` 机制，提供全局两档可调密度：
   * **舒适模式（Comfortable）**：`--font-size-scale: 1.0`（正文 14px，适合大显示器与普通 Web 浏览）。
   * **紧凑模式（Compact）**：`--font-size-scale: 0.93`（正文自动紧缩为 13px，卡片自动升密，适合桌面窗口化高强度作业）。

### 4.2 唯一 8 档字阶表（Typography Scale）

| Token | 像素值 | 字重搭配 | 职责分工与限制 |
|---|---|---|---|
| `text-10` | 10px | 500 / mono | 徽标内部数字、图表刻度、微型运行标签（**严禁用于中文正文**） |
| `text-11` | 11px | 500 / mono | 双轨成本微徽章、CLI 状态标签、密级元数据 |
| `text-xs` | 12px | 400 / 500 | **中文显示绝对下限**；辅助解释文本、小属性标签、次要操作按钮 |
| `text-13` | 13px | 400 / 500 | **卡片与表格黄金正文**；工单列表主行、属性键值、AI 工具卡内容 |
| `text-sm` | 14px | 400 / 500 | **全站阅读主基准**；表单输入框、长段落描述、文档正文、弹窗说明 |
| `text-base`| 16px | 500 / 600 | 卡片主标题（CardTitle）、重要分组名称 |
| `text-lg` | 18px | 600 | 区块大标题、二级页头标题（SubPageToolbar） |
| `text-xl` | 20px | 600 | 顶级页面标题（PageHeader） |

* **字重三档约束**：仅允许 `400`（正文）、`500`（交互与键值）、`600`（标题与强调）。禁止使用 300（太细失真）与 700+（笨重粗俗）。
* **数字与代码强制等宽**：所有涉及工单 ID、时间、耗时、Token 数值、版本号处，强制添加 `font-mono` 与 `tabular-nums`。

---

## 五、系统化动效设计理念与白名单

### 5.1 动效设计理念
> **动效的唯一目的是引导用户心智、表达状态转移与降低认知负荷。一切纯装饰性、延迟操作的炫技动效均属于视觉负债。**

### 5.2 动效场景与时长白名单

```
[100ms: 微交互反馈] ───→ [160ms: 结构性展开/折叠] ───→ [220ms: 浮层与模态入场]
        │                           │                                │
  按压/选中/复选框             工具卡展开/抽屉滑动             弹窗/全局工作台滑出
```

| 动效类别 | 时长 (Duration) | 缓动曲线 (Easing) | 适用场景与具体规范 |
|---|---|---|---|
| **微交互反馈<br>(Micro Feedback)** | `100ms` ~ `120ms` | `cubic-bezier(0.2, 0, 0, 1)` | 按钮点击微缩（`active:scale-[0.98]`）、Checkbox 勾选动画、选项 Hover 浅底微变。 |
| **结构性展开/折叠<br>(Transition)** | `150ms` ~ `180ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | AI 工具卡折叠/展开、手风琴切换、Tab 居中滑块滑动定位。 |
| **模态与浮层入场<br>(Overlay Entrance)** | `200ms` ~ `240ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | 对话框（Dialog）居中微升入场（`scale: 0.96 ➔ 1.0, opacity: 0 ➔ 1`）、侧滑抽屉（Sheet）。 |
| **AI 运行呼吸节律<br>(AI Pulse Rhythm)** | `1.2s` 循环 | `ease-in-out` | 思考中脉冲点（柔和烟熏紫透明度 40% ➔ 100% 呼吸，指示 Agent 正在思考）。 |

### 5.3 动效工程规则
1. **仅允许 GPU 属性变换**：只允许对 `transform`（平移、缩放）和 `opacity` 进行过渡，严禁直接对 `height` / `width` / `margin` 设置过渡动画（以防重排卡顿）。
2. **强制支持减弱动效**：全站 CSS 严格包裹 `@media (prefers-reduced-motion: reduce)`，开启时自动将所有过渡时间降为 `0ms` 或平滑透明度渐变。

---

## 六、双表面组件全量清单与属性标识

全站组件统一划分为 **[AI] AI 执行面组件**、**[HUMAN] 人类控制面组件** 与 **[HYBRID] 双表面治理交汇组件**。

### 6.1 AI 执行面组件矩阵 [AI]

本矩阵专为承载复杂、多样化的 AI 交互与工件流转而设计：

```
┌─────────────────────────────────────────────────────────────┐
│ 🧠 [AI] 思考折叠核 (ThinkingStream)                          │
│    26px 微型胶囊 · 烟熏紫呼吸点 · 显示推理步数与耗时 · 点击下拉代码流 │
├─────────────────────────────────────────────────────────────┤
│ ⚡ [AI] 工具/终端胶囊卡 (ToolTerminalCapsule)                 │
│    单行折叠 (动词×实体+徽章) · 执行打字流 · 点击展开 Diff/终端输出 │
├─────────────────────────────────────────────────────────────┤
│ 🤝 [AI] 多 Agent 协作交接卡 (AgentHandoffCard)              │
│    架构师 ➔ 开发 Agent 链路 · 嵌入工件锚点 · 附 3 项验收门禁状态    │
├─────────────────────────────────────────────────────────────┤
│ 🛡️ [HYBRID] 决策证据抽屉卡 (DecisionCardShell)              │
│    五段式骨架 · 变更对比 · 证据抽屉收纳 · 冷却门禁 · 1~4 快捷键   │
├─────────────────────────────────────────────────────────────┤
│ 🪙 [AI] 双轨成本微徽章 (DualTrackMetricPill)                │
│    11px Mono 状态条 · 实时展示 Token / 耗时 / 模型 / 成本美元      │
└─────────────────────────────────────────────────────────────┘
```

| 组件标识 | 文件路径 | 核心定位与结构特征 |
|---|---|---|
| **`ThinkingStream`** [AI] | `modules/assistant/components/thinking-stream.tsx` | **思考折叠核**：26px 高度紧凑条，展示动画脉冲 +「已深度思考 (14 步) · 耗时 1.2s」；点击下拉就地展示高亮推理链。 |
| **`AssistantToolCard`** [AI] | `modules/assistant/components/assistant-tool-card.tsx` | **工具/命令执行胶囊**：默认单行折叠（动词×实体 + 摘要 + 状态徽章）；展开后高密度承载参数输入、结果预览或错误堆栈。 |
| **`AgentHandoffCard`** [AI] | `modules/office/components/agent-handoff-card.tsx` | **多 Agent 协作交接卡**：可视化展示 Agent A 派发给 Agent B 的工件流转，并显式嵌入门禁验收状态。 |
| **`AssistantRunLine`** [AI] | `modules/assistant/components/assistant-run-line.tsx` | **CLI 动态执行流水行**：常驻底部或卡片内，轮询当前正在运行的 step、命令与毫秒级耗时。 |
| **`ColleagueCard`** [AI] | `modules/office/components/colleague-card.tsx` | **办公室 AI 同事卡**：紧凑卡片排版，承载信任分 Badge、忙闲脉冲点、当前任务、容量条、待决计数与开聊入口。 |
| **`DualTrackMetricPill`** [AI] | `shared/components/dual-track-metric-pill.tsx` | **双轨成本微徽章**：`11px Mono` 纯色阶微卡，在 AI 卡片右下角紧凑展示 `3.2k tok · 1.8s · Claude 3.7 · $0.004`。 |
| **`AISlotLayer`** [AI] | `shared/ai-slot/ai-slot-layer.tsx` | **局部就地解释层**：Ctrl+左键实体卡片触发局部 Portal 浮层解释，长按 Ctrl 500ms 触发可解释高亮。 |
| **`AnchorQaThread`** [AI] | `modules/assistant/components/anchor-qa-thread.tsx` | **行内锚点幽灵问答**：工单详情页右栏「✨ 问 AI」微按钮，点击就地内联展开紧凑问答线程。 |
| **`MemorySection`** [AI] | `modules/settings/pages/sections/memory-section.tsx` | **AI 记忆档案检视卡**：按全局/项目 Scope 呈现记忆原子、置信度分数及固定/归档操作。 |
| **`AssistantPanel`** [AI] | `modules/assistant/components/assistant-panel.tsx` | **全局第三栏 AI 工作台**：主助理长驻交互抽屉，支持多轮流式对话、历史会话切换与一键转 CLI 执行。 |

### 6.2 人类控制面组件矩阵 [HUMAN]

| 类别 | 组件标识 | 文件路径 | 治理要求与规范 |
|---|---|---|---|
| **页面外壳** | `PageShell` [HUMAN] | `ui/page-shell.tsx` | 承载页面的根容器，统筹极简区与高密区的边界。 |
| **页面头部** | `PageHeader` [HUMAN] | `ui/page-header.tsx` | 单行紧凑页头，集成图标、标题、收藏星标、指标胶囊与操作组。 |
| **操作动作** | `HeaderActionButton` [HUMAN] | `ui/header-action-button.tsx` | 圆形仅图标按钮，Hover 时平滑展开为文字胶囊，减少页头视觉杂乱。 |
| **列表工具栏** | `ToolbarRow` [HUMAN] | `ui/toolbar-row.tsx` | 包含视图快照持久化、视图切换滑块（List/Board/Gantt）与级联筛选入口。 |
| **二级页工具栏** | `SubPageToolbar` [HUMAN] | `ui/sub-page-toolbar.tsx` | 包含返回、面包屑导航、居中选项卡滑块、翻页器与侧栏开关。 |
| **基础卡片容器** | `Card` / `SectionCard` [HUMAN] | `ui/card.tsx`, `ui/section-card.tsx` | 标准卡片封装，内边距严格收敛至 `p-3.5`~`p-4`。 |
| **数据列表原语** | `DataList` [HUMAN] | `ui/data-list.tsx` | 包含行多选、状态胶囊、分组手风琴、右键上下文菜单。 |
| **数据表格原语** | `DataTable` / `DataTableShell` [HUMAN] | `ui/data-table.tsx` | 支持排序、筛选、分页的高密表格容器。 |
| **条件筛选条** | `FilterChipsRow` [HUMAN] | `ui/filter-chips.tsx` | Linear 风格条件条（`[字段 ｜ 算子 ｜ 值 ｜ ×]` 拼接 Chip）。 |
| **属性面板** | `PropertyPanel` [HUMAN] | `ui/property-panel.tsx` | 改造后的矩形微控件面板，专用于工单详情右侧属性编辑。 |
| **创建弹窗** | `UnifiedCreateDialog` [HUMAN] | `ui/unified-create-dialog.tsx` | 工单/缺陷/文档统一创建入口（后续按模块拆分瘦身）。 |

### 6.3 双表面治理交汇组件 [HYBRID]

| 组件标识 | 文件路径 | 交互契约与治理意义 |
|---|---|---|
| **`DecisionCard`** / **`DecisionCardShell`** [HYBRID] | `shared/decision-card/` | **五段式卡片文法**：提案人头像 ➔ 紧迫度 Chip ➔ 变更主体槽 ➔ 影响行 ➔ 证据抽屉（高危操作强制展开+冷却门禁）➔ 动作栏（1 接受 / 2 微调 / 3 驳回）。 |
| **`CollaborationSection`** [HYBRID] | `modules/office/components/collaboration-section.tsx` | **接口工件交接卡**：前后端 AI 协作状态机（Requested ➔ Committed ➔ Delivered ➔ Verified），带人工验收与驳回闸门。 |
| **`ContractBindingsPanel`** [HYBRID] | `modules/contract/components/` | **代码契约绑定面板**：可视化显示 AGENTS.md、CLAUDE.md、CHANGELOG 等契约文件的三态（Managed/Synced/Detached）同步状态。 |
| **`StatusIconFrame`** / **`StatusPill`** [HYBRID] | `shared/status/` | **统一人类与 AI 状态视觉**：低饱和度圆角框 + 居中状态图标，全仓唯一状态映射源。 |

---

## 七、风格不统一组件整改与淘汰路线

全仓现有 7 处偏离本规范的“异类”组件，按以下方案实施重构与收敛：

| 偏离组件 | 现状问题与风格冲突 | 明确整改动作 | 优先级 |
|---|---|---|---|
| **`PropertyPanel` 胶囊组**<br>([property-panel.tsx](file:///E:/Project/agent-project-manager/apps/frontend/src/components/ui/property-panel.tsx)) | 详情页右栏自创了 `CapsuleSelect`、`DateCapsuleField`，全走 `rounded-full` 大药丸圆角，与主表单 `rounded-md` 割裂。 | **全面矩形化**：将圆角统一收敛为 `rounded-md`（6px），与全局 Select / DatePicker 统一设计语言。 | P0 (阻断) |
| **`DesignSystemPage` 内部 Mock**<br>([design-system-page.tsx](file:///E:/Project/agent-project-manager/apps/frontend/src/modules/design-system/pages/design-system-page.tsx)) | 存在 276 处非语义 Tailwind 裸色，且手写了 `StatusChip`、`PriorityIcon`、`SeverityBar` 等伪组件。 | **彻底清理**：移除手写伪组件，全面替换为正式的 `StatusPill`、`StatusIconFrame`，裸色全部收敛为语义 Token。 | P0 (阻断) |
| **`StatsCard` 鲜艳彩底**<br>([stats-card.tsx](file:///E:/Project/agent-project-manager/apps/frontend/src/components/ui/stats-card.tsx)) | 采用了高饱和度的 `STATS_THEMES.blue / yellow` 大面积纯色彩底，视觉跳脱。 | **改用统一 `bg-card`**：背景统一为低调卡片底，仅数字与微图标采用低饱和点缀。 | P1 |
| **`Empty` (官方) 双轨**<br>([empty.tsx](file:///E:/Project/agent-project-manager/apps/frontend/src/components/ui/empty.tsx)) | 官方 5 插槽虚线大框组件无生产页面消费，与自研轻量 `EmptyState` 形成双轨。 | **删除 `empty.tsx`**：全站彻底收敛为统一的 `EmptyState`。 | P1 |
| **`FloatingDock` & `ChapterScrubber`**<br>([floating-dock.tsx](file:///E:/Project/agent-project-manager/apps/frontend/src/components/ui/floating-dock.tsx)) | 带有浓厚的 macOS 磁性放大动效与拟物阴影，与 Linear 极简工程风不符。 | 从生产组件目录剥离，不再作为标准件推荐。 | P2 |
| **错误页双轨**<br>(`error-page` vs `page-error-fallback`) | 路由级大插画错误页与局部轻量错误条视觉不一致。 | 二合一收敛为统一的轻量卡片式错误降级组件。 | P2 |
| **`UnifiedCreateDialog` 内部样式**<br>([unified-create-dialog.tsx](file:///E:/Project/agent-project-manager/apps/frontend/src/components/ui/unified-create-dialog.tsx)) | 1730 行庞大单文件，内嵌了大量老旧边框与大间距。 | 内边距统一紧凑化至 `p-3.5`，后续按业务类型拆分下沉。 | P2 |

---

## 八、质量门禁与实施推进规则

### 8.1 实施三原则
1. **先出标准，确认再改代码**：本文件为全局设计改造的最高依据，用户确认批准后方可开工全仓修改。
2. **Design System 页面作为第一试验田**：全仓页面改造前，必须先在 `/app/design-system` 页面完成新样式、低饱和多色色阶与 5 类 AI 卡片的落地渲染与验证。
3. **严禁新增私有样式与硬编码裸色**：新开发页面一律走语义 Token，违反者由 `pnpm lint:semantic` 拦截。

### 8.2 验收清单（Checklist）
- [ ] 低饱和 5 色阶 Token 正式落入 `index.css`。
- [ ] 卡片内边距默认下调至 `p-3.5`~`p-4`，子卡片 `p-2.5`~`p-3`。
- [ ] 5 类 AI 专属高密度卡片在设计系统页演示正常。
- [ ] Design System 页面 Bug（双 button 嵌套、网络拦截、锚点缺失、裸色污染）彻底修复。
- [ ] 7 个不统一异类组件完成收敛。
- [ ] 全链路质量门禁 `pnpm quality:gate` 通过。
