# AGENTS.md — 前端开发治理手册

> **适用范围**：`apps/frontend`（React 19 + Vite + TypeScript）
> **设计真相源**：`refers/APM/`（Figma 设计还原参考，对应 `figma` 主题预设）
> **组件索引**：`COMPONENTS.md`（开发第一入口）；**页面模板**：`src/templates/`
> **版本**：v1.2（2026-08：Tailwind v4 @theme + shadcn CLI 官方管理 + base-ui 唯一基线，radix 清零）

---

## 1. 项目整体介绍

Agent Project Manager (APM) 是一个 AI 驱动的项目管理工具。前端为单页应用（SPA），采用 **React 19 + Vite 7 + TypeScript 5 + TailwindCSS 4**，UI 组件为 **shadcn/ui 官方配方（base-ui 原语）+ 产品自研组件** 构建。

### 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | React 19 + Vite 7 |
| 路由 | react-router-dom v7（`src/app/router.tsx`） |
| 状态 | Zustand（全局）+ TanStack Query v5（服务端状态） |
| UI 原语 | @base-ui/react（唯一无头基线，radix 已于 2026-08 清零） |
| 样式 | TailwindCSS 4（@tailwindcss/vite）+ @theme token 体系 |
| 主题 | 3 套预设：`figma`（默认，refer 设计）/ `linear` / `notion` |
| i18n | i18next + react-i18next |

### 设计还原来源

- `refers/APM/` 为设计还原参考（Figma 导出），其中 `theme.css` 定义设计变量、`src/app/components/` 定义组件与布局、`src/app/pages/` 定义页面。
- 当前前端以 `figma` 主题预设（`src/index.css` 中 `:root[data-theme-preset='figma']`）还原该设计。
- **默认主题预设为 `figma`**（`src/shared/theme/presets.ts` 的 `getInitialThemePreset`），应用启动即呈现 refer 设计。

---

## 2. 前端目录结构

```
apps/frontend/
├── src/
│   ├── main.tsx                    # 入口：Provider 装配（Query/Theme/Confirm/Router）
│   ├── app/
│   │   └── router.tsx              # 路由表（/boot /login /app/* 等）
│   ├── components/
│   │   ├── ui/                     # ★ 基础组件库（shadcn 官方 base-ui 配方 + 产品自研）
│   │   ├── brand/                  # 品牌 Logo
│   │   └── icons/                  # 自定义图标
│   ├── shared/
│   │   ├── theme/                  # ★ 主题系统（presets/theme-context/tokens）
│   │   ├── layout/                 # 应用外壳 ShellLayout + Sidebar 适配
│   │   ├── components/             # 跨模块共享组件（Kanban、Gantt、错误边界等）
│   │   ├── command-palette/        # 命令面板 Provider
│   │   ├── confirm/                # 确认对话框
│   │   ├── tabs/                   # 多标签页上下文
│   │   ├── filters/                # 筛选状态适配
│   │   ├── mdx/                    # MDX 渲染相关
│   │   └── lib/                    # 共享工具
│   ├── modules/                    # ★ 业务模块（每个模块自包含）
│   │   └── {module}/
│   │       ├── api/                # TanStack Query 客户端
│   │       ├── components/         # 模块组件
│   │       ├── hooks/              # 自定义 hooks
│   │       ├── pages/              # 路由级页面
│   │       └── index.ts            # 公共导出
│   ├── infrastructure/             # api-client / event-client / store
│   ├── hooks/                      # 通用 hooks（use-mobile/use-toast/useTranslation）
│   ├── lib/                        # utils / design-tokens（规范文档）
│   ├── i18n/                       # 国际化（locales/）
│   ├── templates/                  # ★ 页面骨架模板（list/detail/form，开发复制起点）
│   ├── test/  test-utils/          # 测试
│   └── index.css                   # ★ 全局样式 + 主题变量 + @theme token（统一调整只改这里）
├── scripts/
│   ├── check-semantic-classes.mjs      # 语义化颜色类校验
│   ├── check-ui-governance.mjs         # UI 治理校验（toast/confirm/table 等）
│   ├── check-tailwind-arbitrary.mjs    # 禁任意值（白名单制）
│   ├── check-component-registry.mjs    # 组件登记对账（COMPONENTS.md）
│   ├── migrate-tailwind-tokens.mjs     # 任意值→token 迁移（一次性，留档）
│   └── shadcn-cli/npm-forward.cjs      # shadcn CLI 的 npm→pnpm 转发垫片（用法见 §4.5）
├── COMPONENTS.md                   # ★ 组件总索引（开发第一入口）
└── components.json                 # shadcn CLI 配置（style: base-vega）
```

### 路由约定

- 业务页面统一挂在 `/app` 下（受 `AuthGuard` 保护）。
- 登录页 `/login`、启动页 `/boot`、桌面初始化 `/desktop/init` 为独立路由。
- 新增页面：在 `src/app/router.tsx` 注册，懒加载优先（`lazy()`）。

---

## 3. 设计系统架构

### 3.1 设计变量（Token）

设计变量全部定义在 `src/index.css` 的 CSS 变量中，并按 `data-theme-preset` 提供预设覆盖：

| 分类 | 变量 | refer 值（figma 预设） |
|------|------|------------------------|
| 背景/前景 | `--background` `--foreground` | `#ffffff` / 近黑 |
| 主色 | `--primary` `--primary-foreground` | `#030213`（近黑）/ 白 |
| 卡片 | `--card` `--card-foreground` | 白 / 近黑 |
| 弱化 | `--muted` `--muted-foreground` | `#ececf0` / `#717182` |
| 强调 | `--accent` `--accent-foreground` | `#e9ebef` / 近黑 |
| 危险 | `--destructive` `--destructive-foreground` | `#d4183d` / 白 |
| 边框 | `--border` | `rgba(0,0,0,0.1)` |
| 输入 | `--input` `--input-background` | `transparent` / `#f3f3f5` |
| 开关 | `--switch-background` | `#cbced4` |
| 圆角 | `--radius` | `0.625rem` |
| 侧栏 | `--sidebar*` | 浅灰（`oklch(0.985)`） |

> ⚠️ **语义化颜色**：业务代码禁止使用原始 Tailwind 色（`bg-emerald-500`、`text-violet-500` 等），统一使用语义 token：`bg-accent-blue/green/yellow/red/purple(-light)`、`text-accent-*`、`bg-content-*`、`bg-sidebar-*`。详见 `src/lib/design-tokens.ts` 与 `scripts/check-semantic-classes.mjs`。

### 3.2 排版

- 字体：`Inter`（sans）+ `JetBrains Mono`（mono），在 `index.css` 顶部引入。
- 字号规范：`text-xs`(12) 标签 / `text-sm`(14) 正文 / `text-base`(16) 区块标题 / `text-lg`(18) 页面标题（PageHeader） / `text-xl`(20) 大标题。
- 标题默认 `font-medium`、行高 1.5；页面标题由 `PageHeader` 统一提供：**单行高度**（`py-2`），裸图标（`size-5`，与标题视觉同高）+ `text-lg font-semibold` 标题 + 收藏星标；无副标题/描述行，数量类信息用 `metrics` 计数胶囊（收藏星标之后，integration 页 StatusBadge 同款形态的小号版本）。

### 3.3 间距 / 字号 / 圆角 / 阴影（token 体系）

尺寸 token 全部固化在 `src/index.css` 的 `@theme` 块——**全站统一调整只改配置文件**；业务代码**禁止任意值**（`w-[260px]`、`text-[13px]` 等，`pnpm lint:tokens` 强制）。

- **间距 / 宽高**：Tailwind spacing 公式 `key × 4px`（`p-4`=16px、`w-15`=60px、`max-w-150`=600px）；config 已扩展 42 档非默认步进（3px…980px），`max-w/min-w/max-h/min-h` 镜像同一刻度。
- **字号**：默认语义档（`text-xs`12 / `sm`14 / `base`16 / `lg`18 / `xl`20）+ 紧凑微字号 **px 直读档**（`text-8/9/10/11/13/15/22/28/32` = 同数值 px）。
- **弹窗 / 滚动区语义尺寸**：`h-dialog`=95vh、`w-dialog`=95vw、`w-dialog-wide`=90vw、`max-h-dialog`=80vh、`max-h-dialog-full`=90vh。
- **圆角**：`rounded-md`（控件，`--radius-control`）/ `rounded-lg`（面板，`--radius`）/ `rounded-xl`（卡片）/ `rounded-full`（胶囊）/ `rounded-xs`（2px）/ `rounded-chip`。
- **品牌色**：`brand-linear(-light/-deep/-darkest)`、`brand-atlassian(-dark/-darker)`，仅用于对应集成商标识。
- **阴影**：默认无阴影（refer 风格），需要时用 `shadow-xs/sm/md` 语义类。
- **确属无法 token 化的复杂值**（grid 模板、多段 calc、运行时 `var()`）：加入 `scripts/check-tailwind-arbitrary.mjs` 白名单并说明理由。

### 3.4 组件分层

```
┌─ 页面层  modules/*/pages        （组合组件，不含裸样式堆叠）
├─ 业务组件 modules/*/components   （领域组件，基于基础组件组合）
├─ 共享组件 shared/components      （跨模块：Kanban/Gantt/错误边界）
├─ 基础组件 components/ui/*        （★ 唯一允许写样式细节的层）
└─ 原语     @base-ui/react（唯一） 
```

**规则**：样式细节只允许出现在 `components/ui/*`；页面与业务组件通过 props/variant/className 组合，不重复堆叠样式类。

---

## 4. 页面开发流程（spec 先行）

> 目标：把设计决策前置到文本阶段，代码阶段没有自由发挥空间。完整流程已固化为项目 skill `frontend-page`（`.zcode/skills/frontend-page/`），开发/改造页面时优先调用。

### 4.1 必读入口（写代码前）

1. `COMPONENTS.md` —— 组件总索引（组件路径/用途/关键 props/分类）
2. `src/templates/` —— 页面骨架模板：`list-page.tsx` / `detail-page.tsx` / `form-page.tsx`
3. 本文 §6.2 页面开发模板（PageHeader/ToolbarRow/SubPageToolbar 用法细则）

### 4.2 两步流程

1. **spec（不写代码，等确认）**：
   - 模板选择（list / detail / form，或说明为何都不适用）
   - 区域划分：每区域用哪些组件——只能引用 `COMPONENTS.md` 已登记组件；需要新组件单独列出并说明现有组件为何不能满足
   - 数据来源（复用/新建的 api hooks）与路由注册点（router.tsx / page-registry）
2. **实现**：复制模板骨架替换占位；页面结构不得偏离模板。

### 4.3 改造现有页面

现有页面结构偏离模板时，**默认按模板重写页面骨架并迁移数据逻辑**，禁止在旧结构上修修补补叠加样式。

### 4.4 参考稿协议（Figma Make / Open Design 等）

参考稿代码是**结构意图，不是可粘贴代码**：保留其布局结构意图 → 组件映射为本地同位组件（查 `COMPONENTS.md`）→ 颜色/间距/字号一律替换为本项目 token。禁止直接复制参考稿代码。

### 4.5 shadcn CLI 组件管理（2026-08 起官方管理流程）

基础组件统一由 shadcn CLI 管理（`components.json` style: base-vega，base-ui 配方）。**禁止手写新的基础组件**——官方有的用 `shadcn add`，官方没有的先评估是否自研并登记。

使用流程（Windows/pnpm 环境两个已知坑的规避）：

1. **先装 npm 转发垫片**（CLI 误判包管理器会用 npm 重装依赖树，导致崩溃）：
   ```bash
   cp scripts/shadcn-cli/npm-forward.cjs node_modules/.bin/
   printf '@node "%%~dp0\\npm-forward.cjs" %%*\n' > node_modules/.bin/npm.cmd
   ```
2. **替换已有组件必须"先删后加"**（CLI 4.x 的 `-o` 覆盖在解析 `@/` 别名时会静默写入错误目录）：
   ```bash
   rm src/components/ui/<组件>.tsx
   yes n | pnpm exec shadcn add <组件> -y   # yes n = 拒绝顺带覆盖其依赖组件
   ```
3. **生成后必做**：`pnpm type-check`（API 变化会暴露在调用点）→ `pnpm lint:tokens`（官方组件带的任意值：可 token 化的替换，运行时复杂值入白名单）。
4. **兼容层保留**：部分组件文件尾部有「兼容层」区块（button asChild、tooltip delayDuration、context-menu 元数据 API、dialog keepDefaultWidth、tabs segmented、checkbox/switch onChange、PopoverAnchor、PasswordInput、skeleton 套件、**toast sonner 命令式 API**）——官方升级重生成时**必须重新合并这些区块**，并跑全量测试。
5. **禁止引入 radix**：无头基线唯一为 `@base-ui/react`；`shadcn add` 拉入 radix 配方组件时需手工移植为 base-ui。
6. **coss ui 注册表**（2026-08 起）：官方没有的组件优先查 [coss.com/ui](https://coss.com/ui)（Base UI + Tailwind 同源配方）。不用 CLI，直接拉注册表 JSON：
   ```bash
   curl -s https://coss.com/ui/r/<name>.json   # files[0].content 即源码；registryDependencies 列出上游依赖组件
   ```
   移植时统一改导入（`@/registry/default/lib/utils` → `@/lib/utils`）、按项目 token 语义调整（如 coss 的 `--destructive-foreground` 是红字色，项目里红字用 `text-destructive`）、并在 `COMPONENTS.md` 登记。已引入清单见 COMPONENTS.md 头部基线说明。

---

## 5. 组件复用规范（MUST）

1. **优先复用**：开发页面时，必须优先使用 `components/ui/` 与 `shared/components/` 已有组件——**先查 `COMPONENTS.md` 总索引**（Button、Card、Input、Select、Dialog、Badge、PageHeader、HeaderActionButton、ToolbarRow / useToolbarViews、SubPageToolbar、AnchoredMenu、Tabs、Table、Tooltip 等）。
2. **优先扩展**：已有组件可通过以下方式扩展，禁止另建相似组件：
   - `variant`（cva 变体）— 新增视觉变体时优先在 `components/ui/*` 的 `cva` 中追加；
   - `size` / 其他语义 prop — 扩展组件接口；
   - `className` — 通过 `cn()` 合并覆盖间距/布局；
   - `asChild`（Slot）— 组合语义。
3. **只有现有组件无法满足需求时才新增组件**，新增时必须：
   - **先在 `COMPONENTS.md` 登记**（引用格式 `ui/<文件名>.tsx`，`pnpm lint:registry` 强制对账）；
   - 放置到 `components/ui/`（通用）或 `modules/{module}/components/`（领域）；
   - 基于 @base-ui/react 原语构建（禁止引入 radix），导出 `cn` 合并的 className；
   - 在 `src/modules/design-system/pages/design-system-page.tsx` 中补充展示用例；
   - 遵循 `src/lib/design-tokens.ts` 的 token 规则。
4. **禁止**：
   - 页面中直接写裸 `<button>`/`<input>`/`<table>`（用 Button/Input/Table 组件）；
   - `from 'sonner'`（sonner 已删除；统一 `@/components/ui/toast` 的 `ToastProvider` + `toast()`，lint:ui-governance 强制）；
   - 直接 `window.confirm`（用 `useConfirm`）；
   - 在业务代码中使用原始 Tailwind 颜色类。

---

## 6. 后续开发注意事项

### 6.1 新增/修改组件

- 先查 `COMPONENTS.md` 组件索引确认是否已有组件，必要时再看 `components/ui/README.md`。
- 修改基础组件默认样式会全局生效：改前评估所有调用点（可用 `Select-String` 全仓搜索），并在 Design System 页面验证。
- 保留扩展变体：refer 对齐只调整默认样式，业务侧新增的 variant（如 `danger`、`warning`、`size="xs"`）不得删除。

### 6.2 页面开发模板

```tsx
import { PageHeader } from '@/components/ui/page-header'
import { HeaderActionButton } from '@/components/ui/header-action-button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, MyIcon } from 'lucide-react'

export function MyPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        icon={MyIcon}
        title="标题"
        metrics={[{ id: 'total', label: '数量', value: 12 }]}
        actions={<HeaderActionButton icon={Plus} label="新建" />}
      />
      <Card>
        <CardContent>内容</CardContent>
      </Card>
    </div>
  )
}
```

> PageHeader 规则：单行高度，无 `description` 副标题；操作按钮一律用 `HeaderActionButton`（正圆形仅图标，hover 展开胶囊，见 `/app/design-system#page-header`），不要放普通文本 Button。

列表页在 PageHeader 之下使用 `ToolbarRow`（见 `/app/design-system#toolbar`）：

```tsx
import { ToolbarRow, useToolbarViews } from '@/components/ui/toolbar-row'

const toolbar = useToolbarViews({
  key: 'my-page',                                     // localStorage: toolbar-views:my-page
  defaults: [{ id: 'all', name: '全部', icon: 'list', builtIn: true, snapshot: 初始状态 }],
  onApply: (snapshot) => { /* 恢复筛选/样式/排序到页面 state */ },
})
useEffect(() => { toolbar.updateActiveSnapshot({ ...当前全部相关状态 }) }, [deps])

<ToolbarRow
  {...toolbar 绑定}
  viewStyle={{ value, onChange, options: [{ value: 'list', label: '列表', icon: List }] }}  // ≤3 居中，>3 右侧下拉
  filterMenu={{ search: { value, onChange }, items: [筛选元数据] }}    // false 移除
  displayMenu={{ items: [...] }}                                       // false 移除
  downloadMenu={{ items: [...] }}                                      // false 移除
  extraActions={[页面注册按钮]}
/>
```

> ToolbarRow 规则：自身**无上下分界线**（py-2 单行）；不放搜索框（搜索在筛选下拉内）；左侧视图胶囊由 `useToolbarViews` 持久化管理；居中样式切换用 `SegmentedControl variant="rect"`（delivery 风格圆角矩形滑块）；右侧按钮组复用 HeaderActionButton（默认 筛选/显示/下载 三个下拉按钮，`badge` 显示筛选数量红点角标）。

二级子页面（详情页）用 `SubPageToolbar`（见 `/app/design-system#sub-page-toolbar`）放在 PageHeader 之上：

```tsx
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar'

<SubPageToolbar
  aiId="task.task-detail"
  onBack={() => navigate(-1)}                                  // 默认即 history back
  breadcrumbs={[{ label: 'Tasks', to: '/app/tasks' }, { label: shortId }]}
  tabs={{ value, onChange, items: [{ value, label, icon }] }}  // 可选：居中子页签
  pager={{ hasPrev, hasNext, onPrev, onNext, position: '3/12' }} // 可选：同集合翻页
  actions={<>…HeaderActionButton…</>}                           // 可选：自定义按钮组
  sidebar={{ open, onToggle }}                                  // 可选：最后一个固定侧栏开关按钮
/>
```

> SubPageToolbar 规则：布局与 ToolbarRow 一致（三栏 grid、单行、无分界线）；返回按钮最左、面包屑次之；居中页签为 rect 滑块；翻页器在按钮组左侧；侧栏开关固定为最后一个按钮，无右侧面板的页面不传 `sidebar`。

### 6.3 主题与预设

- 新增颜色必须先加到 `index.css` 的 `:root` / `.dark` / 各 preset，再在 `src/index.css` 的 `@theme inline` 注册语义色。
- `figma` 预设是 refer 设计的真相源，改动需与 `refers/APM/src/styles/theme.css` 对照。
- 主题切换逻辑在 `src/shared/theme/theme-context.tsx`，预设定义在 `presets.ts`。

### 6.4 校验命令

```bash
pnpm --filter frontend lint                 # 语义类 + UI 治理 + 禁任意值 + 组件登记 + eslint
pnpm --filter frontend lint:tokens          # 仅禁任意值
pnpm --filter frontend lint:registry        # 仅组件登记对账
pnpm --filter frontend type-check           # tsc -b
pnpm --filter frontend build                # 类型检查 + 打包
pnpm --filter frontend test -- --run        # 单测
```

### 6.5 设计系统预览页

- 路由 `/app/design-system`，**仅 `import.meta.env.DEV` 注册**（生产不打包）。
- 页面：`src/modules/design-system/pages/design-system-page.tsx`，纯前端渲染，覆盖颜色/字体/间距/圆角/阴影/按钮/卡片/表单/表格/弹窗等全部核心组件。
- 新组件必须在此页补充展示，用于验证复用效果与样式还原质量。

### 6.6 与 refer 的差异约定（已与产品确认）

| 项 | 决策 |
|----|------|
| 整体布局 | 保留当前“圆角内容卡片”布局（内容区 rounded-xl 卡片），**不**改为 refer 平铺 |
| 默认主题 | `figma`（refer 设计） |
| Badge/Card/Input/PageHeader | 默认样式已对齐 refer，保留扩展变体 |
| 改名/废弃页面（Git/GlobalTeam/Plugins/Terminal） | 保留现有路由映射，不新增 mock 页 |
| 缺失页面（Delivery/Metadata） | ✅ Delivery 已还原为 dev-only 页面（`/app/delivery`）；Metadata 内容已并入设置页（`/app/settings`），`modules/metadata` 已于 2026-08 清理删除 |

### 6.7 页面级对齐约定（refer 还原）

- **对齐原则**：页面只对齐展示形态（布局/间隔/颜色/字体/交互），不改变数据流；缺失真实数据的区块使用静态示例并标记 `data-mock="true"` + `// MOCK DATA` 注释，接入真实 API 后移除。
- **组件复用**：页面必须基于 `components/ui/*` 组件组合；refer 中出现的复合组件（TaskDetailDialog→task-detail-drawer、MemberPicker→member-picker、DatePicker→calendar/popover、PriorityPicker/StatusPicker→select、NotificationPopover、AIAssistantPanel→ai-hub 组件）优先复用项目已有等价物，不新建相似组件。
- **已还原页面**：
  - `modules/delivery`（dev-only）：交付树三视图 + 验收矩阵 + Agent 状态 + 列/视图配置 + 导出 + 标注（mock）
  - `modules/analytics`：5-Tab（Overview 真实 API；Cost/Quality/Risk/Team 为 mock）
  - `modules/search`：类型过滤 + 分组 + 键盘导航（mock 数据）
- **已移除页面**：
  - `modules/metadata`（dev-only）：Labels/Statuses/Roles/Templates 四 Tab 已并入设置页（`/app/settings`），对应 manager 组件仍由 `modules/core-config` 提供。
- **dev-only 页面规范**：路由仅 `import.meta.env.DEV` 注册，Sidebar 入口带 `(DEV)` 标注；页面顶层加 `data-ai-page` 与 `data-mock` 属性。

---

## 7. 变更摘要要求

每次改动提交需包含：
- 修改范围（文件/模块）
- 变更类型（feature/refactor/fix/config/docs）
- 影响分析（组件改动波及的调用点）
- 同步状态（Design System 页面、AGENTS.md、token 文档是否同步）
