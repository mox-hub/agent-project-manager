# COMPONENTS.md — 前端组件清单（agent 与人的共用索引）

> **⚠️ 本文件由 `src/modules/design-system/registry.ts` 再生，请勿手工编辑。**
> 再生命令：`node scripts/gen-components-md.mjs`（在 `apps/frontend/` 下执行）。
> 要增删改组件条目 → 改 `registry.ts` → 重跑上面这条命令；`lint:registry` 会校验双向对账。

> **用途**：开发页面前的第一入口。任何页面开发/改造前先查此表，优先复用；**新增 `components/ui/` 组件必须先登记**（登记表 = registry.ts）。
> **设计宪法**：样式规则最高依据是 `docs/design/PRINCIPLES.md`——分区策略、语义字阶、间距 4px 网格、语义色、阴影档、lucide 唯一 UI 图标、动效白名单、三态 token。本表管「有哪些组件」，宪法管「怎么用」。
> **导入方式**：按文件路径直接导入（如 `@/components/ui/button`），不使用 barrel。
> **展示预览**：`/app/design-system`（dev-only）可查看组件实际效果，并正在改造为「对账面 + 裁决面」（registry 驱动渲染）。
> **消费方列**：本表不写推测值——`consumers` 由 `lint:registry` 扫描真实引用后回填 registry，再经本脚本再生。空 `—` = 待回填。

## 治理计数（registry 派生）

| 状态 | 数量 | 计入 LU 分母 | 必须在画廊展示 | 是否需消费方 |
|---|---|---|---|---|
| ✅ canonical | 300 | ✅ 计入 | ✅ 必须 | ✅ 必须 ≥1 |
| 📦 standby | 17 | ❌ 不计 | ✅ 必须 | ❌ 不要求 |
| 🔶 review | 17 | ❌ 暂不计 | ✅ 必须（带醒目标记） | ❌ 暂不要求 |
| ⛔ deprecated | 1 | ❌ 不计 | ✅ 标记 deprecated | — |
| **合计** | **335** | | | |

> 当前 0 条的状态：`internal`。注：`ui/menu-surface.ts` 实测有模块层消费方（document 模块页面直接 import 其中的常量），故按实测登记为 `canonical` 而非方案 §三 E6 建议的 `internal`（差异见批 1 报告）。

分区分布（画廊四分区口径）：

| 分区 | 数量 |
|---|---|
| Primitives | 64 |
| App Components | 246 |
| AI Execution | 25 |

## 待裁决清单（设计系统页「只看待裁决」视图同源）

共 **35** 项：`status: review`（17）或 `status: standby` 但带 review 数据（18）。按方案 §七 D 项裁决：**先标记、不删除**，人工在 `/app/design-system` 审阅后由批 9 执行清退（决策写入 `component-review-decisions.json`）。

| 组件 | 路径 | 状态 | 建议 | 理由 | 裁决期限 |
|---|---|---|---|---|---|
| accordion | `src/components/ui/accordion.tsx` | 📦 standby | keep | 官方注册表基线件（base-ui 配方），零引用（仅画廊），零维护成本 | 2026-10-31 |
| anchored-menu | `src/components/ui/anchored-menu.tsx` | 🔶 review | delete | 零引用（实测）——与 ui/menu 能力重叠，锚定下拉统一走 menu / dropdown-menu | 2026-10-31 |
| app-dock | `src/components/ui/app-dock.tsx` | 📦 standby | delete | 自研长尾：消费方 1（bottom-dock），与 shared/components/bottom-dock 能力重叠 | 2026-10-31 |
| aspect-ratio | `src/components/ui/aspect-ratio.tsx` | 📦 standby | keep | 官方注册表基线件（base-ui 配方），零引用（仅画廊），零维护成本 | 2026-10-31 |
| autocomplete | `src/components/ui/autocomplete.tsx` | 🔶 review | merge → combobox | 消费方仅 1（命令面板），与 ui/combobox 能力重叠（输入过滤 + 建议列表） | 2026-10-31 |
| breadcrumb | `src/components/ui/breadcrumb.tsx` | 📦 standby | keep | 官方注册表基线件（base-ui 配方），零引用（仅画廊），零维护成本 | 2026-10-31 |
| button-group | `src/components/ui/button-group.tsx` | 📦 standby | keep | 自研长尾：零引用（仅画廊），与 button / toggle-group 能力边界待查 | 2026-10-31 |
| calendar | `src/components/ui/calendar.tsx` | 📦 standby | keep | 官方注册表基线件（react-day-picker 封装），零引用（仅画廊），零维护成本 | 2026-10-31 |
| collapsible | `src/components/ui/collapsible.tsx` | 📦 standby | keep | 官方注册表基线件（base-ui 配方），零引用（仅画廊），零维护成本 | 2026-10-31 |
| direction | `src/components/ui/direction.tsx` | 🔶 review | delete | 零引用（实测）——base-ui DirectionProvider 再导出，当前无 RTL 需求 | 2026-10-31 |
| drawer | `src/components/ui/drawer.tsx` | 📦 standby | keep | 官方注册表基线件（base-ui 配方），零引用（仅画廊），零维护成本 | 2026-10-31 |
| dropdown-menu | `src/components/ui/dropdown-menu.tsx` | ⛔ deprecated | merge → menu | 与 ui/menu（coss 配方，唯一菜单实现）双轨。2026-09-27 批 3 实物 API 比对结论：**差异大、非直接替换件**——Content 缺省 align 为 start 对 center、条目排版成体系不同、Checkbox/RadioItem 缺 inset、Shortcut 为 span 对 kbd、SubContent 定位不同，且本件 data-slot 槽位被 shared/lib/floating-layers.ts 生产依赖。2026-09-28 裁决 A：已扩 gen-components-md.mjs 解析 expiresAt，原先「生成器不认该槽位、写入即被丢弃」的工具互斥**已解除**，本件正式置 deprecated 限期迁移（至 2026-12-31）；迁移指引见 ui/dropdown-menu.tsx 文件头。（**清退期限 2026-12-31** · §19.6，逾期 CI 失败） | — |
| floating-dock | `src/components/ui/floating-dock.tsx` | 📦 standby | delete | 自研长尾：零引用（仅画廊），与 shared/components/bottom-dock 能力重叠 | 2026-10-31 |
| input-otp | `src/components/ui/input-otp.tsx` | 📦 standby | keep | 官方注册表基线件（input-otp 库封装），零引用（仅画廊），零维护成本 | 2026-10-31 |
| menubar | `src/components/ui/menubar.tsx` | 📦 standby | keep | 官方注册表基线件（base-ui 配方），零引用（仅画廊），零维护成本 | 2026-10-31 |
| meter | `src/components/ui/meter.tsx` | 📦 standby | standby | 自研长尾：零引用（仅画廊），coss 来源件，方案倾向保留为 standby | 2026-10-31 |
| navigation-menu | `src/components/ui/navigation-menu.tsx` | 🔶 review | delete | 零引用（实测）——横向导航由 menu / breadcrumb / tabs 承载 | 2026-10-31 |
| number-field | `src/components/ui/number-field.tsx` | 📦 standby | standby | 自研长尾：零引用（仅画廊），coss 来源件，方案倾向保留为 standby | 2026-10-31 |
| sidebar | `src/components/ui/sidebar.tsx` | 🔶 review | delete | 零引用（实测）——与 ui/sidebar-panel（消费方 6）能力重叠 | 2026-10-31 |
| slider | `src/components/ui/slider.tsx` | 📦 standby | keep | 官方注册表基线件（base-ui 配方），零引用（仅画廊），零维护成本 | 2026-10-31 |
| stat-card | `src/components/ui/stat-card.tsx` | 🔶 review | merge → stats-card | 命名双轨：与 ui/stats-card（消费方 10）能力重叠，本件消费方仅 1 | 2026-10-31 |
| tab-bar | `src/components/ui/tab-bar.tsx` | 📦 standby | delete | 自研长尾：消费方 1（shell-layout），与 bottom-dock / 页签能力重叠 | 2026-10-31 |
| toggle | `src/components/ui/toggle.tsx` | 📦 standby | keep | 官方注册表基线件（base-ui 配方），零引用（仅画廊），零维护成本 | 2026-10-31 |
| toggle-group | `src/components/ui/toggle-group.tsx` | 📦 standby | keep | 官方注册表基线件（base-ui 配方），零引用（仅画廊），零维护成本 | 2026-10-31 |
| view-display-popover | `src/components/ui/view-display-popover.tsx` | 🔶 review | delete | 零引用（实测）——与 ui/popover 能力重叠；唯一带测试的死件，测试一并列为候选 | 2026-10-31 |
| bug-template-helper | `src/shared/components/create-dialog/entity-templates/bug-template-helper.tsx` | 🔶 review | delete | 零引用（实测）——仅被自身 __tests__ 引用，无生产消费方 | 2026-10-31 |
| doc-category-chips | `src/shared/components/create-dialog/entity-templates/doc-category-chips.tsx` | 🔶 review | delete | 零引用（实测）——仅被自身 __tests__ 引用，无生产消费方 | 2026-10-31 |
| filter-panel | `src/shared/ui/filter-panel.tsx` | 🔶 review | delete | 零引用（实测）——唯一引用是 project-list-page.test.tsx 的 vi.mock；且构成第二个 ui 命名空间 | 2026-10-31 |
| thinking-stream | `src/modules/assistant/components/thinking-stream.tsx` | 🔶 review | delete | 零引用（实测）——仅被设计系统页引用，无模块内消费方 | 2026-10-31 |
| batch-create-tasks-dialog | `src/modules/issue/components/batch-create-tasks-dialog.tsx` | 🔶 review | delete | 零引用（实测）——全库无 import，且不在画廊 | 2026-10-31 |
| task-board | `src/modules/issue/components/task-board.tsx` | 🔶 review | delete | 零引用（实测）——全库无 import（看板能力由 shared/components/board-view 承载），且不在画廊 | 2026-10-31 |
| task-rows | `src/modules/issue/components/task-rows.tsx` | 🔶 review | delete | 零引用（实测）——仅被自身测试与设计系统页引用 | 2026-10-31 |
| agent-handoff-card | `src/modules/office/components/agent-handoff-card.tsx` | 🔶 review | delete | 零引用（实测）——仅被设计系统页引用，无模块内消费方 | 2026-10-31 |
| mention-renderer | `src/modules/team-member/components/mention-renderer.tsx` | 🔶 review | delete | 零引用（实测）——仅被设计系统页引用；mention 渲染实际走 MarkdownView | 2026-10-31 |
| mention-textarea | `src/modules/team-member/components/mention-textarea.tsx` | 🔶 review | delete | 零引用（实测）——仅被设计系统页与一处 vi.mock 引用 | 2026-10-31 |

## 完整清单

### Primitives（64）

#### UI 原子层 `src/components/ui/`（64）

| 组件 | 路径 | 状态 | 消费方 | 治理说明 |
|---|---|---|---|---|
| accordion | `src/components/ui/accordion.tsx` | 📦 standby | — | 官方注册表基线件（base-ui 配方），零引用（仅画廊），零维护成本 |
| alert | `src/components/ui/alert.tsx` | ✅ canonical | — | — |
| alert-dialog | `src/components/ui/alert-dialog.tsx` | ✅ canonical | — | — |
| anchored-menu | `src/components/ui/anchored-menu.tsx` | 🔶 review | — | 零引用（实测）——与 ui/menu 能力重叠，锚定下拉统一走 menu / dropdown-menu |
| aspect-ratio | `src/components/ui/aspect-ratio.tsx` | 📦 standby | — | 官方注册表基线件（base-ui 配方），零引用（仅画廊），零维护成本 |
| autocomplete | `src/components/ui/autocomplete.tsx` | 🔶 review | — | 消费方仅 1（命令面板），与 ui/combobox 能力重叠（输入过滤 + 建议列表） |
| avatar | `src/components/ui/avatar.tsx` | ✅ canonical | — | — |
| avatar-picker-field | `src/components/ui/avatar-picker-field.tsx` | ✅ canonical | — | — |
| badge | `src/components/ui/badge.tsx` | ✅ canonical | — | — |
| breadcrumb | `src/components/ui/breadcrumb.tsx` | 📦 standby | — | 官方注册表基线件（base-ui 配方），零引用（仅画廊），零维护成本 |
| button | `src/components/ui/button.tsx` | ✅ canonical | — | — |
| button-group | `src/components/ui/button-group.tsx` | 📦 standby | — | 自研长尾：零引用（仅画廊），与 button / toggle-group 能力边界待查 |
| calendar | `src/components/ui/calendar.tsx` | 📦 standby | — | 官方注册表基线件（react-day-picker 封装），零引用（仅画廊），零维护成本 |
| card | `src/components/ui/card.tsx` | ✅ canonical | — | — |
| chapter-scrubber | `src/components/ui/chapter-scrubber.tsx` | ✅ canonical | — | — |
| checkbox | `src/components/ui/checkbox.tsx` | ✅ canonical | — | — |
| checkbox-group | `src/components/ui/checkbox-group.tsx` | ✅ canonical | — | — |
| collapsible | `src/components/ui/collapsible.tsx` | 📦 standby | — | 官方注册表基线件（base-ui 配方），零引用（仅画廊），零维护成本 |
| color-picker | `src/components/ui/color-picker.tsx` | ✅ canonical | — | — |
| combobox | `src/components/ui/combobox.tsx` | ✅ canonical | — | — |
| context-menu | `src/components/ui/context-menu.tsx` | ✅ canonical | — | — |
| date-picker | `src/components/ui/date-picker.tsx` | ✅ canonical | — | — |
| dialog | `src/components/ui/dialog.tsx` | ✅ canonical | — | — |
| direction | `src/components/ui/direction.tsx` | 🔶 review | — | 零引用（实测）——base-ui DirectionProvider 再导出，当前无 RTL 需求 |
| drawer | `src/components/ui/drawer.tsx` | 📦 standby | — | 官方注册表基线件（base-ui 配方），零引用（仅画廊），零维护成本 |
| dropdown-menu | `src/components/ui/dropdown-menu.tsx` | ⛔ deprecated | — | 与 ui/menu（coss 配方，唯一菜单实现）双轨。2026-09-27 批 3 实物 API 比对结论：**差异大、非直接替换件**——Content 缺省 align 为 start 对 center、条目排版成体系不同、Checkbox/RadioItem 缺 inset、Shortcut 为 span 对 kbd、SubContent 定位不同，且本件 data-slot 槽位被 shared/lib/floating-layers.ts 生产依赖。2026-09-28 裁决 A：已扩 gen-components-md.mjs 解析 expiresAt，原先「生成器不认该槽位、写入即被丢弃」的工具互斥**已解除**，本件正式置 deprecated 限期迁移（至 2026-12-31）；迁移指引见 ui/dropdown-menu.tsx 文件头。（**清退期限 2026-12-31** · §19.6，逾期 CI 失败） |
| field | `src/components/ui/field.tsx` | ✅ canonical | — | — |
| form | `src/components/ui/form.tsx` | ✅ canonical | — | — |
| hover-card | `src/components/ui/hover-card.tsx` | ✅ canonical | — | — |
| icon-stack | `src/components/ui/icon-stack.tsx` | ✅ canonical | — | — |
| input | `src/components/ui/input.tsx` | ✅ canonical | — | — |
| input-group | `src/components/ui/input-group.tsx` | ✅ canonical | — | — |
| input-otp | `src/components/ui/input-otp.tsx` | 📦 standby | — | 官方注册表基线件（input-otp 库封装），零引用（仅画廊），零维护成本 |
| kbd | `src/components/ui/kbd.tsx` | ✅ canonical | — | — |
| label | `src/components/ui/label.tsx` | ✅ canonical | — | — |
| menu | `src/components/ui/menu.tsx` | ✅ canonical | — | — |
| menu-surface | `src/components/ui/menu-surface.ts` | ✅ canonical | — | — |
| menubar | `src/components/ui/menubar.tsx` | 📦 standby | — | 官方注册表基线件（base-ui 配方），零引用（仅画廊），零维护成本 |
| meter | `src/components/ui/meter.tsx` | 📦 standby | — | 自研长尾：零引用（仅画廊），coss 来源件，方案倾向保留为 standby |
| select-field | `src/components/ui/select-field.tsx` | ✅ canonical | — | — |
| navigation-menu | `src/components/ui/navigation-menu.tsx` | 🔶 review | — | 零引用（实测）——横向导航由 menu / breadcrumb / tabs 承载 |
| number-field | `src/components/ui/number-field.tsx` | 📦 standby | — | 自研长尾：零引用（仅画廊），coss 来源件，方案倾向保留为 standby |
| pagination | `src/components/ui/pagination.tsx` | ✅ canonical | — | — |
| popover | `src/components/ui/popover.tsx` | ✅ canonical | — | — |
| progress | `src/components/ui/progress.tsx` | ✅ canonical | — | — |
| radio-group | `src/components/ui/radio-group.tsx` | ✅ canonical | — | — |
| scroll-area | `src/components/ui/scroll-area.tsx` | ✅ canonical | — | — |
| segmented-control | `src/components/ui/segmented-control.tsx` | ✅ canonical | — | — |
| select | `src/components/ui/select.tsx` | ✅ canonical | — | — |
| separator | `src/components/ui/separator.tsx` | ✅ canonical | — | — |
| sheet | `src/components/ui/sheet.tsx` | ✅ canonical | — | — |
| slider | `src/components/ui/slider.tsx` | 📦 standby | — | 官方注册表基线件（base-ui 配方），零引用（仅画廊），零维护成本 |
| sortable | `src/components/ui/sortable.tsx` | ✅ canonical | — | — |
| spinner | `src/components/ui/spinner.tsx` | ✅ canonical | — | — |
| status-pill | `src/components/ui/status-pill.tsx` | ✅ canonical | — | — |
| stepper | `src/components/ui/stepper.tsx` | ✅ canonical | — | — |
| switch | `src/components/ui/switch.tsx` | ✅ canonical | — | — |
| tabs | `src/components/ui/tabs.tsx` | ✅ canonical | — | — |
| textarea | `src/components/ui/textarea.tsx` | ✅ canonical | — | — |
| toast | `src/components/ui/toast.tsx` | ✅ canonical | — | — |
| toggle | `src/components/ui/toggle.tsx` | 📦 standby | — | 官方注册表基线件（base-ui 配方），零引用（仅画廊），零维护成本 |
| toggle-group | `src/components/ui/toggle-group.tsx` | 📦 standby | — | 官方注册表基线件（base-ui 配方），零引用（仅画廊），零维护成本 |
| tone | `src/components/ui/tone.ts` | ✅ canonical | — | — |
| tooltip | `src/components/ui/tooltip.tsx` | ✅ canonical | — | — |

### App Components（246）

#### UI 原子层 `src/components/ui/`（40）

| 组件 | 路径 | 状态 | 消费方 | 治理说明 |
|---|---|---|---|---|
| activity-heatmap | `src/components/ui/activity-heatmap.tsx` | ✅ canonical | — | — |
| ai-agent-badge | `src/components/ui/ai-agent-badge.tsx` | ✅ canonical | — | — |
| ai-context-summary | `src/components/ui/ai-context-summary.tsx` | ✅ canonical | — | — |
| ai-execution-badge | `src/components/ui/ai-execution-badge.tsx` | ✅ canonical | — | — |
| app-dock | `src/components/ui/app-dock.tsx` | 📦 standby | — | 自研长尾：消费方 1（bottom-dock），与 shared/components/bottom-dock 能力重叠 |
| async-state | `src/components/ui/async-state.tsx` | ✅ canonical | — | — |
| chart | `src/components/ui/chart.tsx` | ✅ canonical | — | — |
| command | `src/components/ui/command.tsx` | ✅ canonical | — | — |
| data-list | `src/components/ui/data-list.tsx` | ✅ canonical | — | — |
| data-table | `src/components/ui/data-table.tsx` | ✅ canonical | — | — |
| data-table-shell | `src/components/ui/data-table-shell.tsx` | ✅ canonical | — | — |
| document-preview-dialog | `src/components/ui/document-preview-dialog.tsx` | ✅ canonical | — | — |
| dual-track-metric-pill | `src/components/ui/dual-track-metric-pill.tsx` | ✅ canonical | — | — |
| empty-state | `src/components/ui/empty-state.tsx` | ✅ canonical | — | — |
| error-boundary | `src/components/ui/error-boundary.tsx` | ✅ canonical | — | — |
| filter-chips | `src/components/ui/filter-chips.tsx` | ✅ canonical | — | — |
| floating-dock | `src/components/ui/floating-dock.tsx` | 📦 standby | — | 自研长尾：零引用（仅画廊），与 shared/components/bottom-dock 能力重叠 |
| global-loading-state | `src/components/ui/global-loading-state.tsx` | ✅ canonical | — | — |
| header-action-button | `src/components/ui/header-action-button.tsx` | ✅ canonical | — | — |
| icon-metric | `src/components/ui/icon-metric.tsx` | ✅ canonical | — | — |
| item | `src/components/ui/item.tsx` | ✅ canonical | — | — |
| loading-overlay | `src/components/ui/loading-overlay.tsx` | ✅ canonical | — | — |
| mock-badge | `src/components/ui/mock-badge.tsx` | ✅ canonical | — | — |
| page-error-fallback | `src/components/ui/page-error-fallback.tsx` | ✅ canonical | — | — |
| page-header | `src/components/ui/page-header.tsx` | ✅ canonical | — | — |
| page-shell | `src/components/ui/page-shell.tsx` | ✅ canonical | — | — |
| property-panel | `src/components/ui/property-panel.tsx` | ✅ canonical | — | — |
| quick-cards-toggle | `src/components/ui/quick-cards-toggle.tsx` | ✅ canonical | — | — |
| right-sidebar | `src/components/ui/right-sidebar.tsx` | ✅ canonical | — | — |
| section-card | `src/components/ui/section-card.tsx` | ✅ canonical | — | — |
| sidebar | `src/components/ui/sidebar.tsx` | 🔶 review | — | 零引用（实测）——与 ui/sidebar-panel（消费方 6）能力重叠 |
| sidebar-panel | `src/components/ui/sidebar-panel.tsx` | ✅ canonical | — | — |
| skeleton | `src/components/ui/skeleton.tsx` | ✅ canonical | — | — |
| stat-card | `src/components/ui/stat-card.tsx` | 🔶 review | — | 命名双轨：与 ui/stats-card（消费方 10）能力重叠，本件消费方仅 1 |
| stats-card | `src/components/ui/stats-card.tsx` | ✅ canonical | — | — |
| sub-page-toolbar | `src/components/ui/sub-page-toolbar.tsx` | ✅ canonical | — | — |
| tab-bar | `src/components/ui/tab-bar.tsx` | 📦 standby | — | 自研长尾：消费方 1（shell-layout），与 bottom-dock / 页签能力重叠 |
| table | `src/components/ui/table.tsx` | ✅ canonical | — | — |
| toolbar-row | `src/components/ui/toolbar-row.tsx` | ✅ canonical | — | — |
| view-display-popover | `src/components/ui/view-display-popover.tsx` | 🔶 review | — | 零引用（实测）——与 ui/popover 能力重叠；唯一带测试的死件，测试一并列为候选 |

#### 错位目录 `src/shared/ui/`（E7 清退候选）（1）

| 组件 | 路径 | 状态 | 消费方 | 治理说明 |
|---|---|---|---|---|
| filter-panel | `src/shared/ui/filter-panel.tsx` | 🔶 review | — | 零引用（实测）——唯一引用是 project-list-page.test.tsx 的 vi.mock；且构成第二个 ui 命名空间 |

#### 跨模块业务组件 `src/shared/components/`（28）

| 组件 | 路径 | 状态 | 消费方 | 治理说明 |
|---|---|---|---|---|
| board-view | `src/shared/components/board-view/board-view.tsx` | ✅ canonical | — | — |
| bottom-dock | `src/shared/components/bottom-dock/bottom-dock.tsx` | ✅ canonical | — | — |
| dock-metric-badge | `src/shared/components/bottom-dock/dock-metric-badge.tsx` | ✅ canonical | — | — |
| dock-user-popover | `src/shared/components/bottom-dock/dock-user-popover.tsx` | ✅ canonical | — | — |
| cell-select | `src/shared/components/cell-select.tsx` | ✅ canonical | — | — |
| connection-banner | `src/shared/components/connection-banner.tsx` | ✅ canonical | — | — |
| acceptance-criteria-field | `src/shared/components/create-dialog/acceptance-criteria-field.tsx` | ✅ canonical | — | — |
| agent-presence-banner | `src/shared/components/create-dialog/agent-presence-banner.tsx` | ✅ canonical | — | — |
| bug-template-helper | `src/shared/components/create-dialog/entity-templates/bug-template-helper.tsx` | 🔶 review | — | 零引用（实测）——仅被自身 __tests__ 引用，无生产消费方 |
| doc-category-chips | `src/shared/components/create-dialog/entity-templates/doc-category-chips.tsx` | 🔶 review | — | 零引用（实测）——仅被自身 __tests__ 引用，无生产消费方 |
| project-source-tabs | `src/shared/components/create-dialog/entity-templates/project-source-tabs.tsx` | ✅ canonical | — | — |
| create-dialog/index | `src/shared/components/create-dialog/index.tsx` | ✅ canonical | — | — |
| mode-shuttle-button | `src/shared/components/create-dialog/mode-shuttle-button.tsx` | ✅ canonical | — | — |
| property-pills-bar | `src/shared/components/create-dialog/property-pills-bar.tsx` | ✅ canonical | — | — |
| suggestions-card | `src/shared/components/create-dialog/suggestions-card.tsx` | ✅ canonical | — | — |
| unified-create-dialog | `src/shared/components/create-dialog/unified-create-dialog.tsx` | ✅ canonical | — | — |
| emoji-picker | `src/shared/components/emoji-picker/emoji-picker.tsx` | ✅ canonical | — | — |
| favorite-toggle | `src/shared/components/favorite-toggle.tsx` | ✅ canonical | — | — |
| gantt-chart | `src/shared/components/gantt-chart.tsx` | ✅ canonical | — | — |
| global-create-dialog | `src/shared/components/global-create-dialog.tsx` | ✅ canonical | — | — |
| issue-type-icon | `src/shared/components/issue-type-icon.tsx` | ✅ canonical | — | — |
| issue-type-pill | `src/shared/components/issue-type-pill.tsx` | ✅ canonical | — | — |
| language-switcher | `src/shared/components/language-switcher.tsx` | ✅ canonical | — | — |
| markdown-editor | `src/shared/components/markdown-editor.tsx` | ✅ canonical | — | — |
| markdown-live-editor | `src/shared/components/markdown-live-editor.tsx` | ✅ canonical | — | — |
| markdown-view | `src/shared/components/markdown-view.tsx` | ✅ canonical | — | — |
| prompt-editor | `src/shared/components/prompt-editor.tsx` | ✅ canonical | — | — |
| view-switcher | `src/shared/components/view-switcher.tsx` | ✅ canonical | — | — |

#### 模块专用组件 `src/modules/*/components/`（177）

| 组件 | 路径 | 状态 | 消费方 | 治理说明 |
|---|---|---|---|---|
| acceptance-draft-dialog | `src/modules/acceptance/components/acceptance-draft-dialog.tsx` | ✅ canonical | — | — |
| acceptance-form-dialog | `src/modules/acceptance/components/acceptance-form-dialog.tsx` | ✅ canonical | — | — |
| audit-report-panel | `src/modules/acceptance/components/audit-report-panel.tsx` | ✅ canonical | — | — |
| activity-comment | `src/modules/activity/components/activity-comment.tsx` | ✅ canonical | — | — |
| activity-feed | `src/modules/activity/components/activity-feed.tsx` | ✅ canonical | — | — |
| comment-input | `src/modules/activity/components/comment-input.tsx` | ✅ canonical | — | — |
| reaction-bar | `src/modules/activity/components/reaction-bar.tsx` | ✅ canonical | — | — |
| generated-password-dialog | `src/modules/admin/components/generated-password-dialog.tsx` | ✅ canonical | — | — |
| invite-create-dialog | `src/modules/admin/components/invite-create-dialog.tsx` | ✅ canonical | — | — |
| invites-section | `src/modules/admin/components/invites-section.tsx` | ✅ canonical | — | — |
| members-section | `src/modules/admin/components/members-section.tsx` | ✅ canonical | — | — |
| user-accounts-section | `src/modules/admin/components/user-accounts-section.tsx` | ✅ canonical | — | — |
| user-create-dialog | `src/modules/admin/components/user-create-dialog.tsx` | ✅ canonical | — | — |
| user-edit-dialog | `src/modules/admin/components/user-edit-dialog.tsx` | ✅ canonical | — | — |
| admin-guard | `src/modules/auth/components/admin-guard.tsx` | ✅ canonical | — | — |
| auth-guard | `src/modules/auth/components/auth-guard.tsx` | ✅ canonical | — | — |
| auth-shell | `src/modules/auth/components/auth-shell.tsx` | ✅ canonical | — | — |
| auth-visual-card | `src/modules/auth/components/auth-visual-card.tsx` | ✅ canonical | — | — |
| auth-visual | `src/modules/auth/components/auth-visual.tsx` | ✅ canonical | — | — |
| member-card | `src/modules/auth/components/member-card.tsx` | ✅ canonical | — | — |
| server-config-dialog | `src/modules/auth/components/server-config-dialog.tsx` | ✅ canonical | — | — |
| blueprint-canvas | `src/modules/auth/components/visuals/blueprint-canvas.tsx` | ✅ canonical | — | — |
| prism-canvas | `src/modules/auth/components/visuals/prism-canvas.tsx` | ✅ canonical | — | — |
| boot-checklist | `src/modules/boot/components/boot-checklist.tsx` | ✅ canonical | — | — |
| boot-error-drawer | `src/modules/boot/components/boot-error-drawer.tsx` | ✅ canonical | — | — |
| boot-progress-bar | `src/modules/boot/components/boot-progress-bar.tsx` | ✅ canonical | — | — |
| boot-toggle | `src/modules/boot/components/boot-toggle.tsx` | ✅ canonical | — | — |
| contract-bindings-panel | `src/modules/contract/components/contract-bindings-panel.tsx` | ✅ canonical | — | — |
| role-manager | `src/modules/core-config/components/role-manager.tsx` | ✅ canonical | — | — |
| status-manager | `src/modules/core-config/components/status-manager.tsx` | ✅ canonical | — | — |
| tag-manager | `src/modules/core-config/components/tag-manager.tsx` | ✅ canonical | — | — |
| template-manager | `src/modules/core-config/components/template-manager.tsx` | ✅ canonical | — | — |
| decision-review-modal | `src/modules/decision/components/decision-review-modal.tsx` | ✅ canonical | — | — |
| decomposition-review-panel | `src/modules/decision/components/decomposition-review-panel.tsx` | ✅ canonical | — | — |
| BackendStatusBadge | `src/modules/desktop/components/BackendStatusBadge.tsx` | ✅ canonical | — | — |
| desktop-gate | `src/modules/desktop/components/desktop-gate.tsx` | ✅ canonical | — | — |
| desktop-log-card | `src/modules/desktop/components/desktop-log-card.tsx` | ✅ canonical | — | — |
| desktop-preferences-card | `src/modules/desktop/components/desktop-preferences-card.tsx` | ✅ canonical | — | — |
| process-monitor-card | `src/modules/desktop/components/process-monitor-card.tsx` | ✅ canonical | — | — |
| approval-dialog | `src/modules/document/components/approval-dialog.tsx` | ✅ canonical | — | — |
| document-properties-panel | `src/modules/document/components/document-properties-panel.tsx` | ✅ canonical | — | — |
| document-task-links | `src/modules/document/components/document-task-links.tsx` | ✅ canonical | — | — |
| mdx-editor | `src/modules/document/components/mdx-editor.tsx` | ✅ canonical | — | — |
| mdx-renderer | `src/modules/document/components/mdx-renderer.tsx` | ✅ canonical | — | — |
| mdx-toolbar | `src/modules/document/components/mdx-toolbar.tsx` | ✅ canonical | — | — |
| revision-impact-banner | `src/modules/document/components/revision-impact-banner.tsx` | ✅ canonical | — | — |
| section-navigation | `src/modules/document/components/section-navigation.tsx` | ✅ canonical | — | — |
| section-task-links-list | `src/modules/document/components/section-task-links-list.tsx` | ✅ canonical | — | — |
| task-picker-dialog | `src/modules/document/components/task-picker-dialog.tsx` | ✅ canonical | — | — |
| version-diff-view | `src/modules/document/components/version-diff-view.tsx` | ✅ canonical | — | — |
| version-history-panel | `src/modules/document/components/version-history-panel.tsx` | ✅ canonical | — | — |
| run-details-dialog | `src/modules/executions/components/run-details-dialog.tsx` | ✅ canonical | — | — |
| run-diagnosis-section | `src/modules/executions/components/run-diagnosis-section.tsx` | ✅ canonical | — | — |
| run-event-list | `src/modules/executions/components/run-event-list.tsx` | ✅ canonical | — | — |
| run-info-panel | `src/modules/executions/components/run-info-panel.tsx` | ✅ canonical | — | — |
| run-overview-card | `src/modules/executions/components/run-overview-card.tsx` | ✅ canonical | — | — |
| run-status | `src/modules/executions/components/run-status.tsx` | ✅ canonical | — | — |
| run-timeline | `src/modules/executions/components/run-timeline.tsx` | ✅ canonical | — | — |
| step-detail-panel | `src/modules/executions/components/step-detail-panel.tsx` | ✅ canonical | — | — |
| bind-repository-dialog | `src/modules/git/components/bind-repository-dialog.tsx` | ✅ canonical | — | — |
| branch-list | `src/modules/git/components/branch-list.tsx` | ✅ canonical | — | — |
| commit-list | `src/modules/git/components/commit-list.tsx` | ✅ canonical | — | — |
| diff-viewer | `src/modules/git/components/diff-viewer.tsx` | ✅ canonical | — | — |
| git-command-panel | `src/modules/git/components/git-command-panel.tsx` | ✅ canonical | — | — |
| git-tool-status | `src/modules/git/components/git-tool-status.tsx` | ✅ canonical | — | — |
| pull-request-card | `src/modules/git/components/pull-request-card.tsx` | ✅ canonical | — | — |
| pull-request-list | `src/modules/git/components/pull-request-list.tsx` | ✅ canonical | — | — |
| repository-list | `src/modules/git/components/repository-list.tsx` | ✅ canonical | — | — |
| workspace-config | `src/modules/git/components/workspace-config.tsx` | ✅ canonical | — | — |
| github-config-form | `src/modules/github/components/github-config-form.tsx` | ✅ canonical | — | — |
| github-panel | `src/modules/github/components/github-panel.tsx` | ✅ canonical | — | — |
| github-setup-card | `src/modules/github/components/github-setup-card.tsx` | ✅ canonical | — | — |
| analysis-draft-dialog | `src/modules/intake/components/analysis-draft-dialog.tsx` | ✅ canonical | — | — |
| pipeline-overview-cards | `src/modules/intake/components/pipeline-overview-cards.tsx` | ✅ canonical | — | — |
| readiness-dialog | `src/modules/intake/components/readiness-dialog.tsx` | ✅ canonical | — | — |
| acceptance-criteria-preview | `src/modules/issue/components/acceptance-criteria-preview.tsx` | ✅ canonical | — | — |
| ai-assign-dialog | `src/modules/issue/components/ai-assign-dialog.tsx` | ✅ canonical | — | — |
| batch-create-tasks-dialog | `src/modules/issue/components/batch-create-tasks-dialog.tsx` | 🔶 review | — | 零引用（实测）——全库无 import，且不在画廊 |
| batch-update-issues-dialog | `src/modules/issue/components/batch-update-issues-dialog.tsx` | ✅ canonical | — | — |
| board-presets | `src/modules/issue/components/board-presets.tsx` | ✅ canonical | — | — |
| bug-simple-list | `src/modules/issue/components/bug-simple-list.tsx` | ✅ canonical | — | — |
| cell-editors | `src/modules/issue/components/cell-editors.tsx` | ✅ canonical | — | — |
| completion-review | `src/modules/issue/components/completion-review.tsx` | ✅ canonical | — | — |
| custom-field-input | `src/modules/issue/components/custom-field-input.tsx` | ✅ canonical | — | — |
| execution-items-panel | `src/modules/issue/components/execution-items-panel.tsx` | ✅ canonical | — | — |
| global-task-export-dialog | `src/modules/issue/components/global-task-export-dialog.tsx` | ✅ canonical | — | — |
| issue-dependencies-section | `src/modules/issue/components/issue-dependencies-section.tsx` | ✅ canonical | — | — |
| issue-type-switcher | `src/modules/issue/components/issue-type-switcher.tsx` | ✅ canonical | — | — |
| iteration-detail-dialog | `src/modules/issue/components/iteration-detail-dialog.tsx` | ✅ canonical | — | — |
| iteration-form-dialog | `src/modules/issue/components/iteration-form-dialog.tsx` | ✅ canonical | — | — |
| task-board | `src/modules/issue/components/task-board.tsx` | 🔶 review | — | 零引用（实测）——全库无 import（看板能力由 shared/components/board-view 承载），且不在画廊 |
| task-detail-drawer | `src/modules/issue/components/task-detail-drawer.tsx` | ✅ canonical | — | — |
| task-gantt | `src/modules/issue/components/task-gantt.tsx` | ✅ canonical | — | — |
| task-import-export | `src/modules/issue/components/task-import-export.tsx` | ✅ canonical | — | — |
| task-prompt-panel | `src/modules/issue/components/task-prompt-panel.tsx` | ✅ canonical | — | — |
| task-rows | `src/modules/issue/components/task-rows.tsx` | 🔶 review | — | 零引用（实测）——仅被自身测试与设计系统页引用 |
| task-simple-list | `src/modules/issue/components/task-simple-list.tsx` | ✅ canonical | — | — |
| task-table-view | `src/modules/issue/components/task-table-view.tsx` | ✅ canonical | — | — |
| linear-config-form | `src/modules/linear/components/linear-config-form.tsx` | ✅ canonical | — | — |
| linear-conflict-resolver | `src/modules/linear/components/linear-conflict-resolver.tsx` | ✅ canonical | — | — |
| linear-projects-table | `src/modules/linear/components/linear-projects-table.tsx` | ✅ canonical | — | — |
| linear-provider-card | `src/modules/linear/components/linear-provider-card.tsx` | ✅ canonical | — | — |
| linear-status-badge | `src/modules/linear/components/linear-status-badge.tsx` | ✅ canonical | — | — |
| linear-sync-log-drawer | `src/modules/linear/components/linear-sync-log-drawer.tsx` | ✅ canonical | — | — |
| linear-sync-log | `src/modules/linear/components/linear-sync-log.tsx` | ✅ canonical | — | — |
| sync-progress-dialog | `src/modules/linear/components/sync-progress-dialog.tsx` | ✅ canonical | — | — |
| task-linear-panel | `src/modules/linear/components/task-linear-panel.tsx` | ✅ canonical | — | — |
| inbox-item-row | `src/modules/notification/components/inbox-item-row.tsx` | ✅ canonical | — | — |
| notification-settings-dialog | `src/modules/notification/components/notification-settings-dialog.tsx` | ✅ canonical | — | — |
| agent-handoff-card | `src/modules/office/components/agent-handoff-card.tsx` | 🔶 review | — | 零引用（实测）——仅被设计系统页引用，无模块内消费方 |
| collaboration-section | `src/modules/office/components/collaboration-section.tsx` | ✅ canonical | — | — |
| colleague-card | `src/modules/office/components/colleague-card.tsx` | ✅ canonical | — | — |
| onboarding-gate | `src/modules/onboarding/components/onboarding-gate.tsx` | ✅ canonical | — | — |
| api-doc-links-manager | `src/modules/project/components/api-doc-links-manager.tsx` | ✅ canonical | — | — |
| ai-insight-card | `src/modules/project/components/dashboard/ai-insight-card.tsx` | ✅ canonical | — | — |
| integration-status-strip | `src/modules/project/components/dashboard/integration-status-strip.tsx` | ✅ canonical | — | — |
| project-detail-frame | `src/modules/project/components/dashboard/project-detail-frame.tsx` | ✅ canonical | — | — |
| project-detail-header-card | `src/modules/project/components/dashboard/project-detail-header-card.tsx` | ✅ canonical | — | — |
| project-detail-nav | `src/modules/project/components/dashboard/project-detail-nav.tsx` | ✅ canonical | — | — |
| project-health-score-dialog | `src/modules/project/components/dashboard/project-health-score-dialog.tsx` | ✅ canonical | — | — |
| project-overview-charts | `src/modules/project/components/dashboard/project-overview-charts.tsx` | ✅ canonical | — | — |
| project-right-sidebar | `src/modules/project/components/dashboard/project-right-sidebar.tsx` | ✅ canonical | — | — |
| project-sidebar-context | `src/modules/project/components/dashboard/project-sidebar-context.tsx` | ✅ canonical | — | — |
| doc-links-manager | `src/modules/project/components/doc-links-manager.tsx` | ✅ canonical | — | — |
| external-links-manager | `src/modules/project/components/external-links-manager.tsx` | ✅ canonical | — | — |
| grill-interview | `src/modules/project/components/grill/grill-interview.tsx` | ✅ canonical | — | — |
| project-entry-wizard | `src/modules/project/components/import/project-entry-wizard.tsx` | ✅ canonical | — | — |
| interview-chat | `src/modules/project/components/playbook/interview-chat.tsx` | ✅ canonical | — | — |
| interview-dialog | `src/modules/project/components/playbook/interview-dialog.tsx` | ✅ canonical | — | — |
| profile-atom-card | `src/modules/project/components/profile/profile-atom-card.tsx` | ✅ canonical | — | — |
| profile-completeness-ring | `src/modules/project/components/profile/profile-completeness-ring.tsx` | ✅ canonical | — | — |
| profile-health-chips | `src/modules/project/components/profile/profile-health-chips.tsx` | ✅ canonical | — | — |
| profile-slot-section | `src/modules/project/components/profile/profile-slot-section.tsx` | ✅ canonical | — | — |
| project-board | `src/modules/project/components/project-board.tsx` | ✅ canonical | — | — |
| project-cell-editors | `src/modules/project/components/project-cell-editors.tsx` | ✅ canonical | — | — |
| project-gantt | `src/modules/project/components/project-gantt.tsx` | ✅ canonical | — | — |
| project-linear-sync-status | `src/modules/project/components/project-linear-sync-status.tsx` | ✅ canonical | — | — |
| project-property-panel | `src/modules/project/components/project-property-panel.tsx` | ✅ canonical | — | — |
| project-simple-list | `src/modules/project/components/project-simple-list.tsx` | ✅ canonical | — | — |
| project-team-bindings | `src/modules/project/components/project-team-bindings.tsx` | ✅ canonical | — | — |
| project-playbook-settings-panel | `src/modules/project/components/settings/project-playbook-settings-panel.tsx` | ✅ canonical | — | — |
| project-prompt-settings-panel | `src/modules/project/components/settings/project-prompt-settings-panel.tsx` | ✅ canonical | — | — |
| project-team-settings-panel | `src/modules/project/components/settings/project-team-settings-panel.tsx` | ✅ canonical | — | — |
| project-roles-section | `src/modules/project-role/components/project-roles-section.tsx` | ✅ canonical | — | — |
| template-picker-dialog | `src/modules/prompt/components/template-picker-dialog.tsx` | ✅ canonical | — | — |
| release-deliverables-card | `src/modules/release/components/release-deliverables-card.tsx` | ✅ canonical | — | — |
| release-trace-section | `src/modules/release/components/release-trace-section.tsx` | ✅ canonical | — | — |
| mcp-tab | `src/modules/settings/components/ai/mcp-tab.tsx` | ✅ canonical | — | — |
| models-tab | `src/modules/settings/components/ai/models-tab.tsx` | ✅ canonical | — | — |
| overview-tab | `src/modules/settings/components/ai/overview-tab.tsx` | ✅ canonical | — | — |
| provider-visuals | `src/modules/settings/components/ai/provider-visuals.tsx` | ✅ canonical | — | — |
| skills-tab | `src/modules/settings/components/ai/skills-tab.tsx` | ✅ canonical | — | — |
| tools-tab | `src/modules/settings/components/ai/tools-tab.tsx` | ✅ canonical | — | — |
| storage-settings | `src/modules/settings/components/storage-settings.tsx` | ✅ canonical | — | — |
| member-avatar | `src/modules/team-member/components/member-avatar.tsx` | ✅ canonical | — | — |
| member-card-popover | `src/modules/team-member/components/member-card-popover.tsx` | ✅ canonical | — | — |
| member-card-team | `src/modules/team-member/components/member-card.tsx` | ✅ canonical | — | — |
| member-chip | `src/modules/team-member/components/member-chip.tsx` | ✅ canonical | — | — |
| member-create-dialog | `src/modules/team-member/components/member-create-dialog.tsx` | ✅ canonical | — | — |
| member-list | `src/modules/team-member/components/member-list.tsx` | ✅ canonical | — | — |
| member-picker | `src/modules/team-member/components/member-picker.tsx` | ✅ canonical | — | — |
| member-tool-grants | `src/modules/team-member/components/member-tool-grants.tsx` | ✅ canonical | — | — |
| mention-renderer | `src/modules/team-member/components/mention-renderer.tsx` | 🔶 review | — | 零引用（实测）——仅被设计系统页引用；mention 渲染实际走 MarkdownView |
| mention-textarea | `src/modules/team-member/components/mention-textarea.tsx` | 🔶 review | — | 零引用（实测）——仅被设计系统页与一处 vi.mock 引用 |
| team-card | `src/modules/team-member/components/team-card.tsx` | ✅ canonical | — | — |
| team-create-dialog | `src/modules/team-member/components/team-create-dialog.tsx` | ✅ canonical | — | — |
| team-hierarchy-section | `src/modules/team-member/components/team-hierarchy-section.tsx` | ✅ canonical | — | — |
| team-list | `src/modules/team-member/components/team-list.tsx` | ✅ canonical | — | — |
| team-prompt-section | `src/modules/team-member/components/team-prompt-section.tsx` | ✅ canonical | — | — |
| team-stats-section | `src/modules/team-member/components/team-stats-section.tsx` | ✅ canonical | — | — |
| trust-level-badge | `src/modules/team-member/components/trust-level-badge.tsx` | ✅ canonical | — | — |
| workflow-canvas | `src/modules/workflow/components/workflow-canvas.tsx` | ✅ canonical | — | — |
| workflow-node-palette | `src/modules/workflow/components/workflow-node-palette.tsx` | ✅ canonical | — | — |
| workflow-run-panel | `src/modules/workflow/components/workflow-run-panel.tsx` | ✅ canonical | — | — |
| workflow-run-timeline | `src/modules/workflow/components/workflow-run-timeline.tsx` | ✅ canonical | — | — |
| workflow-step-editor | `src/modules/workflow/components/workflow-step-editor.tsx` | ✅ canonical | — | — |
| workflow-trigger-dialog | `src/modules/workflow/components/workflow-trigger-dialog.tsx` | ✅ canonical | — | — |

### AI Execution（25）

#### 模块专用组件 `src/modules/*/components/`（25）

| 组件 | 路径 | 状态 | 消费方 | 治理说明 |
|---|---|---|---|---|
| central-watch-dial | `src/modules/ai-surface/components/central-watch-dial.tsx` | ✅ canonical | — | — |
| decision-queue-panel | `src/modules/ai-surface/components/decision-queue-panel.tsx` | ✅ canonical | — | — |
| omni-dock | `src/modules/ai-surface/components/omni-dock.tsx` | ✅ canonical | — | — |
| pipeline-lane-strip | `src/modules/ai-surface/components/pipeline-lane-strip.tsx` | ✅ canonical | — | — |
| radial-watch-deck | `src/modules/ai-surface/components/radial-watch-deck.tsx` | ✅ canonical | — | — |
| sample-tag | `src/modules/ai-surface/components/sample-tag.tsx` | ✅ canonical | — | — |
| screenplay-controls | `src/modules/ai-surface/components/screenplay-controls.tsx` | ✅ canonical | — | — |
| surface-liveness | `src/modules/ai-surface/components/surface-liveness.tsx` | ✅ canonical | — | — |
| surface-narration-bar | `src/modules/ai-surface/components/surface-narration-bar.tsx` | ✅ canonical | — | — |
| anchor-qa-thread | `src/modules/assistant/components/anchor-qa-thread.tsx` | ✅ canonical | — | — |
| assistant-colleague-slot | `src/modules/assistant/components/assistant-colleague-slot.tsx` | ✅ canonical | — | — |
| assistant-context-chip | `src/modules/assistant/components/assistant-context-chip.tsx` | ✅ canonical | — | — |
| assistant-decision-strip | `src/modules/assistant/components/assistant-decision-strip.tsx` | ✅ canonical | — | — |
| assistant-fab | `src/modules/assistant/components/assistant-fab.tsx` | ✅ canonical | — | — |
| assistant-history-menu | `src/modules/assistant/components/assistant-history-menu.tsx` | ✅ canonical | — | — |
| assistant-message-input | `src/modules/assistant/components/assistant-message-input.tsx` | ✅ canonical | — | — |
| assistant-message-list | `src/modules/assistant/components/assistant-message-list.tsx` | ✅ canonical | — | — |
| assistant-model-picker | `src/modules/assistant/components/assistant-model-picker.tsx` | ✅ canonical | — | — |
| assistant-opening-report | `src/modules/assistant/components/assistant-opening-report.tsx` | ✅ canonical | — | — |
| assistant-panel | `src/modules/assistant/components/assistant-panel.tsx` | ✅ canonical | — | — |
| assistant-quick-prompts | `src/modules/assistant/components/assistant-quick-prompts.tsx` | ✅ canonical | — | — |
| assistant-run-line | `src/modules/assistant/components/assistant-run-line.tsx` | ✅ canonical | — | — |
| assistant-status-dot | `src/modules/assistant/components/assistant-status-dot.tsx` | ✅ canonical | — | — |
| assistant-tool-card | `src/modules/assistant/components/assistant-tool-card.tsx` | ✅ canonical | — | — |
| thinking-stream | `src/modules/assistant/components/thinking-stream.tsx` | 🔶 review | — | 零引用（实测）——仅被设计系统页引用，无模块内消费方 |

---

## 附录 A · 页面骨架速查（人工维护常量，非 registry 派生）

| 场景 | 用什么 |
|------|--------|
| 页面外壳 | `PageShell`（含 PageHeader）或手动 `PageHeader` |
| 页头操作 | `HeaderActionButton`（唯一合法形态，圆形图标 hover 展开胶囊） |
| 统计卡 | `StatsCard`（多项网格）+ `QuickCardsToggle`（页头显隐开关） |
| 列表页工具栏 | `ToolbarRow` + `useToolbarViews`（视图快照持久化） |
| 详情页工具栏 | `SubPageToolbar`（返回/面包屑/居中页签/翻页器/侧栏开关） |
| 详情右栏 | `RightSidebar` + `SidebarButtonGroup` + `PropsCard`/`PropertyRow`/`CapsuleSelect` |
| 列表内容 | `DataList`（多选/分组/右键菜单）或 `Table` 套件 + `DataTableShell` |
| 三态处理 | `AsyncState`（加载/空/错误）或 `PageLoader` / `EmptyState` |
| 弹窗 | `Dialog` 套件；创建类用 `UnifiedCreateDialog` |
| 反馈 | `toast()` + `ToastProvider`（唯一合法 toast）/ `useConfirm` / `Alert` |
| 状态统一视觉 | `status-visuals`（shared/status/）：业务状态 → tone+图标+i18n 的唯一映射源（§19.5 分层：业务层管 status→tone，视觉层管 tone→class） |
| 状态图标底框 | `StatusIconFrame`（shared/status/）：tone 浅底 + 圆角框 + 居中图标，与 status-visuals 配套 |
| 工单类型胶囊 | `IssueTypePill`（shared/components/）：pill=图标+类型名+浅色底、frame=图标圆框 |
| 实体图标注册表 | `EntityIcon`/`getEntityIcon`（shared/entity-icons/）：实体→图标+语义 tone 的唯一映射 |
| Markdown 渲染/编辑 | `MarkdownView` / `MarkdownEditor` / `MarkdownLiveEditor`（shared/components/） |
| 全局实体引用 | `SlashRefTextarea`（shared/entity-ref/）：`/` 触发补全；渲染侧 `ApmRefLink` |
| 提示词编辑/查看 | `PromptEditor`（shared/components/） |
| 决策卡/收件箱 | `DecisionCard`/`DecisionCardShell`（shared/decision-card/） |
| 主 AI 助手 | `AssistantPanel` 等（modules/assistant/components/） |
| 局部侵入问答 | `AISlotLayer`（shared/ai-slot/）+ `useCardExplain` |
| 工作流运行面板 | `WorkflowRunPanel`/`WorkflowRunTimeline`/`buildRunView`（modules/workflow/） |

## 附录 B · 契约备忘（人工维护常量）

- **Select label 契约（2026-09-11）**：base-ui `Select.Value` 只在 Root 收到 `items` 时才能把 value 映射成 label，否则回退 `String(value)`。用 `Select` 裸件且 value ≠ 展示文本时**必须传 `items`**（`{value,label}[]` 或 Record），或改用 `SelectValue` 函数式 children；哨兵项也要写进 `items`。
- **组件准入（§19.6）**：新增 `components/ui/` 组件必须 ① 过 `lint:duplicate`（无同名/近义件）② registry.ts 已登记 ③ 画廊已收录 ④ 有真实消费方或登记为 `standby` ⑤ 外部注册表来源需注明。
- **禁止裸组件（§19.2）**：`components/ui/` 之外禁止 `<button>` `<input>` `<select>` `<textarea>` `<label>` `<table>` `<img>`（站内跳转禁用裸 `<a>`）；豁免走 `design-governance.allowlist.json`（必填 `expiresAt`，最长 90 天）。
- **变体优先（§19.4）**：同一 UI 能力出现第二处实现 → 统一组件 + 新增变体；禁止复制源码（D1）、`className` 视觉覆盖（D2）、包裹改写（D3）。`size` 全库统一 `xs/sm/md/lg` 四档。
- **门禁命令**：`pnpm --filter frontend lint:registry`（本表双向对账）/ `lint:ui-governance` / `check-palette` / `check-icons`。
