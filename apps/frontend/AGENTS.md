# AGENTS.md — 前端开发治理手册

> **适用范围**：`apps/frontend`（React 19 + Vite + TypeScript）
> **设计真相源**：`refers/APM/`（Figma 设计还原参考，对应 `figma` 主题预设）
> **版本**：v1.0（随 refer 设计系统还原完成）

---

## 1. 项目整体介绍

Agent Project Manager (APM) 是一个 AI 驱动的项目管理工具。前端为单页应用（SPA），采用 **React 19 + Vite 7 + TypeScript 5 + TailwindCSS 3**，UI 组件基于 **shadcn/ui 规范 + base-ui/radix 原语** 构建。

### 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | React 19 + Vite 7 |
| 路由 | react-router-dom v7（`src/app/router.tsx`） |
| 状态 | Zustand（全局）+ TanStack Query v5（服务端状态） |
| UI 原语 | @base-ui/react + @radix-ui（无头组件） |
| 样式 | TailwindCSS 3.4 + CSS 变量主题系统 |
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
│   │   ├── ui/                     # ★ 基础组件库（shadcn 风格，81+ 组件）
│   │   ├── kibo-ui/                # 遗留/领域特定 UI（迁移中）
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
│   ├── test/  test-utils/          # 测试
│   └── index.css                   # ★ 全局样式 + 主题变量
├── scripts/
│   ├── check-semantic-classes.mjs  # 语义化颜色类校验
│   └── check-ui-governance.mjs     # UI 治理校验（toast/confirm/table 等）
└── tailwind.config.js
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
- 标题默认 `font-medium`、行高 1.5；页面标题由 `PageHeader` 统一提供（`text-lg font-semibold` + 图标框 + 可选 breadcrumb）。

### 3.3 间距 / 圆角 / 阴影

- 间距：只用 Tailwind 标准刻度 `1/2/3/4/5/6/8`（4px 基数），禁止任意像素值（`px-[11px]` 等）。
- 圆角：`rounded-md`（控件，`--radius-control`）/ `rounded-lg`（面板，`--radius`）/ `rounded-xl`（卡片，`--radius + 4px`）/ `rounded-full`（胶囊）。
- 阴影：默认无阴影（refer 风格），需要时用 `shadow-xs/sm/md` 语义类。

### 3.4 组件分层

```
┌─ 页面层  modules/*/pages        （组合组件，不含裸样式堆叠）
├─ 业务组件 modules/*/components   （领域组件，基于基础组件组合）
├─ 共享组件 shared/components      （跨模块：Kanban/Gantt/错误边界）
├─ 基础组件 components/ui/*        （★ 唯一允许写样式细节的层）
└─ 原语     base-ui / radix       （无头组件）
```

**规则**：样式细节只允许出现在 `components/ui/*`；页面与业务组件通过 props/variant/className 组合，不重复堆叠样式类。

---

## 4. 组件复用规范（MUST）

1. **优先复用**：开发页面时，必须优先使用 `components/ui/` 与 `shared/components/` 已有组件（Button、Card、Input、Select、Dialog、Badge、PageHeader、Tabs、Table、Tooltip 等）。
2. **优先扩展**：已有组件可通过以下方式扩展，禁止另建相似组件：
   - `variant`（cva 变体）— 新增视觉变体时优先在 `components/ui/*` 的 `cva` 中追加；
   - `size` / 其他语义 prop — 扩展组件接口；
   - `className` — 通过 `cn()` 合并覆盖间距/布局；
   - `asChild`（Slot）— 组合语义。
3. **只有现有组件无法满足需求时才新增组件**，新增时必须：
   - 放置到 `components/ui/`（通用）或 `modules/{module}/components/`（领域）；
   - 基于 base-ui/radix 原语构建，导出 `cn` 合并的 className；
   - 在 `src/modules/design-system/pages/design-system-page.tsx` 中补充展示用例；
   - 遵循 `src/lib/design-tokens.ts` 的 token 规则。
4. **禁止**：
   - 页面中直接写裸 `<button>`/`<input>`/`<table>`（用 Button/Input/Table 组件）；
   - 使用 `toast`/`toaster` 旧组件（统一 `sonner` 的 `Toaster` + `toast()`）；
   - 直接 `window.confirm`（用 `useConfirm`）；
   - 在业务代码中使用原始 Tailwind 颜色类。

---

## 5. 后续开发注意事项

### 5.1 新增/修改组件

- 先看 `components/ui/index.ts` 与 `README.md`，确认是否已有组件。
- 修改基础组件默认样式会全局生效：改前评估所有调用点（可用 `Select-String` 全仓搜索），并在 Design System 页面验证。
- 保留扩展变体：refer 对齐只调整默认样式，业务侧新增的 variant（如 `danger`、`warning`、`size="xs"`）不得删除。

### 5.2 页面开发模板

```tsx
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function MyPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        icon={MyIcon}
        title="标题"
        description="描述"
        actions={<Button size="sm">操作</Button>}
      />
      <Card>
        <CardContent>内容</CardContent>
      </Card>
    </div>
  )
}
```

### 5.3 主题与预设

- 新增颜色必须先加到 `index.css` 的 `:root` / `.dark` / 各 preset，再在 `tailwind.config.js` 注册语义色。
- `figma` 预设是 refer 设计的真相源，改动需与 `refers/APM/src/styles/theme.css` 对照。
- 主题切换逻辑在 `src/shared/theme/theme-context.tsx`，预设定义在 `presets.ts`。

### 5.4 校验命令

```bash
pnpm --filter frontend lint                 # 语义类 + UI 治理 + eslint
pnpm --filter frontend type-check           # tsc -b
pnpm --filter frontend build                # 类型检查 + 打包
pnpm --filter frontend test -- --run        # 单测
```

### 5.5 设计系统预览页

- 路由 `/app/design-system`，**仅 `import.meta.env.DEV` 注册**（生产不打包）。
- 页面：`src/modules/design-system/pages/design-system-page.tsx`，纯前端渲染，覆盖颜色/字体/间距/圆角/阴影/按钮/卡片/表单/表格/弹窗等全部核心组件。
- 新组件必须在此页补充展示，用于验证复用效果与样式还原质量。

### 5.6 与 refer 的差异约定（已与产品确认）

| 项 | 决策 |
|----|------|
| 整体布局 | 保留当前“圆角内容卡片”布局（内容区 rounded-xl 卡片），**不**改为 refer 平铺 |
| 默认主题 | `figma`（refer 设计） |
| Badge/Card/Input/PageHeader | 默认样式已对齐 refer，保留扩展变体 |
| 缺失页面（Terminal/Plugins/Delivery/Metadata 等） | 保留现有路由映射，不新增 mock 页 |

---

## 6. 变更摘要要求

每次改动提交需包含：
- 修改范围（文件/模块）
- 变更类型（feature/refactor/fix/config/docs）
- 影响分析（组件改动波及的调用点）
- 同步状态（Design System 页面、AGENTS.md、token 文档是否同步）
