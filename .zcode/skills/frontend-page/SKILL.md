---
name: frontend-page
description: 开发或改造 apps/frontend 页面（新页面、页面改版、页面级 UI 重构）时必须使用。强制执行「读组件索引 → 出页面 spec → 确认 → 按骨架实现 → 自检清单」流程，保证组件复用与设计一致性，禁止自由发挥。
---

# 前端页面开发流程

适用于 `apps/frontend` 下任何新页面开发、现有页面改造、页面级 UI 重构。
不适用于纯数据逻辑改动（无 UI 变更）。

## 流程（按顺序，禁止跳步）

### 1. 读索引与骨架参照

动手前必须先读：

- `docs/design/PRINCIPLES.md` —— **设计宪法（最高样式依据，冲突时以其为准）**：分区策略、唯一字阶、间距/圆角/颜色/图标/动效/三态规则
- `apps/frontend/COMPONENTS.md` —— 组件清单（组件名/路径/用途/关键 props/分类）
- **同域最近似页面** —— 直接读一个同类页面作结构参照（**原 `apps/frontend/src/templates/` 骨架目录已于 2026-08 随剪枝删除，不存在可复制的模板**）
- `apps/frontend/AGENTS.md` §6.2 页面结构约定（PageHeader / ToolbarRow / SubPageToolbar 的装配细则；设计规则一律见宪法）

### 2. 出 spec，等确认

不动代码。输出页面 spec 并等待用户确认：

- **分区判断**：页面属于宪法 §1 的极简区还是高密区，密度基调由此决定
- **骨架选择**：列表 / 详情 / 表单哪一类骨架（参照同域最近似页面与 `AGENTS.md` §6.2），或明确说明为何都不适用
- **区域划分**：页面分几个区域，每个区域用哪些组件（只能引用 COMPONENTS.md 中存在的组件名；需要新组件必须单独列出并说明为何现有组件不能满足）
- **数据来源**：复用哪个模块的 api hook，需要新建哪些
- **路由注册**：router.tsx 挂载点、page-registry 侧栏入口（如有）

### 3. 按骨架实现

- 按 `AGENTS.md` §6.2 的装配细则搭出页面结构（PageHeader / ToolbarRow / SubPageToolbar / 内容区），与同域最近似页面保持一致；结构不得自由发挥。
- 样式规则：严格遵守 `docs/design/PRINCIPLES.md`（**设计宪法，最高依据，不在此处钉版本号**）——8 档**语义**字阶 `text-3xs/2xs/xs/sm/base/lg/xl/2xl`（§3.1，**名字与 px 解耦**）、中文最小 `text-xs`（§2.4）、字重 400/500/600（§2.3）、**行高只许语义档**（§3.4）、间距 4px 网格且四分之一档冻结（§4）、语义色 token（§5）、**全站唯一阴影档 `shadow-xs`**（§3.6）、**hover 不抬升阴影**（§3.6）、动效 `duration-fast/normal/slow` = 120/180/240ms（§7.1）、hover/selected/focus 三态 token（§8）。
  **禁止**：任意值（`w-[260px]`、`text-[13px]` 等）；px 直读字阶（`text-8/9/10/11/12/13/15/22/28/32` 与 `text-3xl` 及以上）；具名阴影档（`shadow-2xs/sm/md/lg/xl/2xl/inner`）与裸 `shadow`；数值行高（`leading-5` 等）；白名单外时长（`duration-100/150/200/250/300/500/…`）。
  **改 token 时的坑**：Tailwind v4 的 `duration-<name>` 读 `--transition-duration-<name>`（写成 `--duration-*` 会静默不生成 CSS），`ease-<name>` 读 `--ease-*`（§7.1）。
  基础组件一律用 `components/ui/` 现有官方组件或经 `shadcn add` 引入（流程见 AGENTS.md §4.5），**禁止引入 radix**（基线唯一 @base-ui/react）。
  **自查命令**：`pnpm --filter frontend lint`（含 `lint:spacing`/`lint:palette` 等全部设计门禁）；改过类名后应 `build` 再跑 `lint:undefined` 抓幽灵类。
- i18n：文案进 locales JSON 时用文本行插入，禁止程序化整体重写（JSON 有重复键风险）。

### 4. 自检清单（实现完成必须逐项核对并在回复中列出结果）

- [ ] 只使用了 COMPONENTS.md 已登记组件；新组件已同时登记到 COMPONENTS.md 与 design-system 展示页
- [ ] `pnpm --filter frontend lint:tokens` 通过（无任意值）
- [ ] `pnpm --filter frontend lint:semantic` 通过（无原始色）
- [ ] `pnpm --filter frontend lint:palette` 通过（无原生 Tailwind 色板类、无 Loader2 JSX 直用）
- [ ] `pnpm --filter frontend lint:spacing` 通过（无冻结档 spacing、无长尾/越界字阶、无 300/700 字重、无数值行高、无白名单外时长、无具名阴影档）
- [ ] `pnpm --filter frontend lint:icons` 通过（图标库合规）
- [ ] `pnpm --filter frontend build && pnpm --filter frontend lint:undefined` 通过（**无幽灵类**：源码里写的类名在构建产物里确实生成了 CSS；改了类名/token 后必跑，否则命名空间写错这类静默失效不会被发现）
- [ ] 宪法三态：hover/selected/focus 用 §8 统一 token；focus-visible 焦点环可见
- [ ] 中文文本 ≥ text-xs；同屏文字层级 ≤3 档；列表行高只取 dense 32 / comfortable 40 两档之一
- [ ] **阴影只用 `shadow-xs`**（或 `shadow-none` 复位）；**hover 不抬升阴影**，反馈走边框/背景/位移/环色（§3.6）
- [ ] 动效只用宪法 §7 白名单（`duration-fast/normal/slow` = 120/180/240ms）；手写组合类走 `.motion-shift`/`.motion-enter`，两套不可混用于同一元素
- [ ] 空态用 EmptyState、加载用 Skeleton，无裸 spinner/手写空态；mock 数据只来自 msw（§9）
- [ ] PageHeader/ToolbarRow/SubPageToolbar 形态符合 AGENTS.md §6.2
- [ ] `pnpm --filter frontend lint && pnpm --filter frontend type-check` 通过

## 特殊规则

- **改造现有页面**：若现有页面结构偏离骨架约定（`AGENTS.md` §6.2），默认**重写页面骨架并迁移数据逻辑**，禁止在旧结构上修修补补叠加样式。
- **参考稿处理**（Figma Make 的 TSX / Open Design 的 HTML 等）：视为**结构意图参考，不是可粘贴代码**。做法：保留其布局结构意图 → 把它的组件映射为本地同位组件（查 COMPONENTS.md）→ 颜色/间距/字号一律替换为本项目 token。禁止直接复制参考稿代码。
- **测试基线**：**所有测试必须通过**；失败即回归，须修复或先撤销变更。（原「task-page.test 与 project-list-page.test 两个存量失败不算回归」条款已于 2026-09-27 废除——把红灯写成规范等于放弃测试门禁，见 `docs/design/修改方案-BCD类-2026-09-27.md` §B9。）

## 验证命令

```bash
pnpm --filter frontend lint
pnpm --filter frontend type-check
pnpm --filter frontend test -- --run
```
