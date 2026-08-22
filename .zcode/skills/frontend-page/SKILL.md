---
name: frontend-page
description: 开发或改造 apps/frontend 页面（新页面、页面改版、页面级 UI 重构）时必须使用。强制执行「读组件索引 → 出页面 spec → 确认 → 按模板实现 → 自检清单」流程，保证组件复用与设计一致性，禁止自由发挥。
---

# 前端页面开发流程

适用于 `apps/frontend` 下任何新页面开发、现有页面改造、页面级 UI 重构。
不适用于纯数据逻辑改动（无 UI 变更）。

## 流程（按顺序，禁止跳步）

### 1. 读索引与模板

动手前必须先读：

- `apps/frontend/COMPONENTS.md` —— 组件清单（组件名/路径/用途/关键 props/分类）
- `apps/frontend/templates/` 下与本任务最接近的模板（`list-page.tsx` / `detail-page.tsx` / `form-page.tsx`）
- `apps/frontend/AGENTS.md` §6.2 页面开发模板与 §3 设计变量规范

### 2. 出 spec，等确认

不动代码。输出页面 spec 并等待用户确认：

- **模板选择**：list / detail / form 哪个骨架，或明确说明为何都不适用
- **区域划分**：页面分几个区域，每个区域用哪些组件（只能引用 COMPONENTS.md 中存在的组件名；需要新组件必须单独列出并说明为何现有组件不能满足）
- **数据来源**：复用哪个模块的 api hook，需要新建哪些
- **路由注册**：router.tsx 挂载点、page-registry 侧栏入口（如有）

### 3. 按模板实现

- 复制模板骨架，替换占位内容；页面结构（PageHeader / ToolbarRow / SubPageToolbar / 内容区）不得偏离模板。
- 样式规则：只用语义色与 Tailwind 标准刻度；**禁止任意值**（`w-[260px]`、`text-[13px]` 等），布局常量用 tailwind.config.js 中的语义 token。
- i18n：文案进 locales JSON 时用文本行插入，禁止程序化整体重写（JSON 有重复键风险）。

### 4. 自检清单（实现完成必须逐项核对并在回复中列出结果）

- [ ] 只使用了 COMPONENTS.md 已登记组件；新组件已同时登记到 COMPONENTS.md 与 design-system 展示页
- [ ] `pnpm --filter frontend lint:tokens` 通过（无任意值）
- [ ] `pnpm --filter frontend lint:semantic` 通过（无原始色）
- [ ] PageHeader/ToolbarRow/SubPageToolbar 形态符合 AGENTS.md §6.2
- [ ] `pnpm --filter frontend lint && pnpm --filter frontend type-check` 通过

## 特殊规则

- **改造现有页面**：若现有页面结构偏离模板，默认按模板**重写页面骨架并迁移数据逻辑**，禁止在旧结构上修修补补叠加样式。
- **参考稿处理**（Figma Make 的 TSX / Open Design 的 HTML 等）：视为**结构意图参考，不是可粘贴代码**。做法：保留其布局结构意图 → 把它的组件映射为本地同位组件（查 COMPONENTS.md）→ 颜色/间距/字号一律替换为本项目 token。禁止直接复制参考稿代码。
- **测试基线**：task-page.test 与 project-list-page.test 两个存量失败与本流程无关，不算回归；其余测试失败必须修复。

## 验证命令

```bash
pnpm --filter frontend lint
pnpm --filter frontend type-check
pnpm --filter frontend test -- --run
```
