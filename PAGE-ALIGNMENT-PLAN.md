# refer 页面级对齐 — 页面清单与对齐需求（待确认）

> 基准分支：`feat/refer-page-alignment`（从 `develop` 2444a64 分出）
> 参考源：`refers/APM/src/app/pages/`（33 个页面）
> 对齐原则：
> 1. 组件尽可能复用 design system 中展示的组件，优先拓展原有组件而非新建
> 2. 页面对齐只影响展示、不影响数据；缺失真实数据的部分直接在组件上标记 mock
> 3. refer 有但项目没有的页面 → 还原并标记 dev tag，仅 develop 模式展示

---

## 一、页面映射总览

### A 类：已有页面（refer 与项目都有，需样式/结构对齐）— 26 个

| # | refer 页面 | 项目页面 | refer 行数 | 项目行数 | 对齐重点 |
|---|---|---|---|---|---|
| 1 | DashboardPage | `project/pages/dashboard-page` | 1074 | 848 | 指标卡、图表、健康徽章 |
| 2 | ProjectsPage | `project/pages/project-list-page` | 640 | 707 | 项目列表行、筛选、创建对话框 |
| 3 | ProjectDashboardPage | `project/pages/project-dashboard-page` | 638 | 610 | 项目总览、健康分、进度 |
| 4 | TaskBoardPage | `project/pages/project-board-page` | 599 | 364 | 看板列、任务卡 |
| 5 | MilestonesPage | `project/pages/project-milestones-page` | 271 | 270 | 里程碑列表 |
| 6 | TeamPage | `project/pages/project-team-page` | 340 | 248 | 成员表、工作量 |
| 7 | ProjectSettingsPage | `project/pages/project-settings-page` | 452 | 611 | 项目设置表单 |
| 8 | TasksPage | `task/pages/tasks-page` | 889 | 374 | 任务列表/看板切换、过滤器 |
| 9 | BugsPage | `task/pages/bugs-page` | 860 | 503 | Bug 列表、严重性 |
| 10 | AcceptancePage | `acceptance/pages/acceptance-list-page` | 418 | 526 | 验收列表 |
| 11 | AcceptanceDetailPage | `acceptance/pages/acceptance-detail-page` | 488 | 578 | 验收详情、执行历史 |
| 12 | AIHubPage | `ai-hub/pages/ai-management-page` | 835 | 1232 | AI 对话面板、模型列表 |
| 13 | AIExecutionsPage | `ai-hub/pages/ai-execution-center-page` | 338 | 780 | 执行列表 |
| 14 | AgentManagementPage | `ai-hub/pages/agent-management-page` | 940 | 940 | Agent 卡片（已对齐？） |
| 15 | AnalyticsPage | `analytics/pages/analytics-page` | 579 | 179 | 分析图表（差异较大） |
| 16 | DocumentsPage | `document/pages/documents-page` | 459 | 547 | 文档列表 |
| 17 | DocumentEditPage | `document/pages/document-edit-page` | 442 | 372 | 编辑器布局 |
| 18 | DocumentViewPage | `document/pages/document-view-page` | 296 | 359 | 文档阅读 |
| 19 | RepositoriesPage | `git/pages/repository-list-page` | 361 | 366 | 仓库列表 |
| 20 | RepositoryDetailPage | `git/pages/repository-detail-page` | 323 | 482 | 仓库详情 |
| 21 | RepositorySettingsPage | `git/pages/repository-settings-page` | 260 | 205 | 仓库设置 |
| 22 | NotificationsPage | `notification/pages/notification-center-page` | 122 | 171 | 通知列表 |
| 23 | SearchPage | `search/pages/search-page` | 284 | 110 | 全局搜索 |
| 24 | SettingsPage | `settings/pages/settings-page` | 379 | 1317 | 设置（项目更大，含 metadata 管理） |
| 25 | HelpPage | `help/pages/help-page` | 444 | 352 | 帮助文档 |
| 26 | DesignSystemPage | `design-system/pages/design-system-page` | 2119 | 2811 | ✅ 已完成 |

### B 类：改名/改路由映射（功能等价，不新增页面）— 3 个

| refer 页面 | 项目等价 | 说明 |
|---|---|---|
| GitPage | `git/pages/repository-list-page` + `git-settings-page` | refer 的 Git 页 → 项目已用 Repositories 体系 |
| GlobalTeamPage | `team-member/pages/members-page` + `teams-page` | refer 全局团队 → 项目 Members/Teams 模块 |
| PluginsPage | `integration/pages/integration-list-page` | refer 插件页 → 项目 Integrations 体系 |
| TerminalPage | （废弃） | Terminal 已并入 Runtime，用户此前确认保留路由映射 |

### C 类：refer 有但项目缺失 → 需还原 + dev tag — 3 个

| # | refer 页面 | 行数 | 内容概述 | 建议路由 |
|---|---|---|---|---|
| 1 | **DeliveryPage** | 1151 | 交付树（项目/里程碑/特性）、dev/pm/user 三视图、验收矩阵、Agent 状态、列配置 | `/app/delivery`（dev only） |
| 2 | **MetadataPage** | 723 | 元数据管理：Labels / Statuses / Roles / Templates 四 Tab，含 mock 数据 | `/app/metadata`（dev only） |
| 3 | **ComponentShowcasePage** | 305 | 业务复合组件展示：TaskDetailDialog、CreateProjectDialog、MemberPicker、DatePicker、PriorityPicker、StatusPicker、LabelPicker、AIAssistantPanel | `/app/components`（dev only） |

> 说明：项目 Settings 页已含 TagManager/StatusManager/RoleManager/TemplateManager（core-config），
> MetadataPage 还原时优先**复用这些 manager 组件**，仅补齐 refer 的页面形态与 mock 标记。

---

## 二、对齐实施计划（按阶段提交）

### 阶段 1：C 类缺失页面还原（3 页，dev tag）
1. `modules/delivery/` → DeliveryPage（复用 design-system 组件；mock 数据标记 `// MOCK` 或 `data-mock`）
2. `modules/metadata/` → MetadataPage（复用 core-config 的 4 个 manager；mock 标记）
3. `modules/showcase/` 或并入 design-system → ComponentShowcasePage（复用 task-form-dialog、member-picker 等已有组件）
4. 路由：仅在 `import.meta.env.DEV` 下注册；Sidebar 导航加 `DEV` badge（参考现有 design-system 入口）

### 阶段 2：A 类高差异页面对齐（优先：Dashboard / Tasks / Bugs / Analytics / Search / ProjectBoard）
- 逐个对照 refer 的布局（PageHeader 图标框、卡片间距 px-6、Badge rounded-md 等已在组件层对齐）
- 页面结构差异大者（AnalyticsPage 579→179、TasksPage 889→374）重点对齐展示结构
- 缺失真实数据的区块标记 mock（不接假 API，仅静态展示）

### 阶段 3：A 类其余页面对齐（批量，低风险）
- 以 PageHeader + Card + Table/List 组合统一各页头部与卡片结构
- 提交粒度：每 2-4 个页面一次 commit

### 阶段 4：验证
- `pnpm --filter frontend type-check && lint && build`
- 设计系统预览页 `/app/design-system` 中补充新增组件的展示用例
- 更新 `apps/frontend/AGENTS.md`（页面清单、mock 约定、dev 页规范）

---

## 三、用户确认结果（2026-08-16）

| 决策项 | 确认结果 |
|---|---|
| C 类缺失页面 | ✅ 还原 **DeliveryPage** + **MetadataPage**（不还原 ComponentShowcasePage） |
| Showcase 归属 | （ComponentShowcase 不还原，该项作废；后续如需以独立路由实施） |
| B 类映射 | ✅ 维持现有路由映射与废弃状态，不新增页面 |
| mock 标记 | ✅ 注释 `// MOCK DATA` + 顶层容器 `data-mock="true"` |
| A 类对齐范围 | ✅ 先对齐核心页（Analytics/Tasks/Bugs/Search/TaskBoard），其余按需继续 |

## 四、待确认问题（已归档）

1. ~~**C 类 3 个缺失页面**是否全部还原？~~ → 已确认：仅 DeliveryPage + MetadataPage
2. ~~**ComponentShowcasePage** 是独立路由还是并入 design-system？~~ → 不还原，该项作废
3. ~~**B 类 GitPage / GlobalTeamPage / PluginsPage**：维持改名映射还是还原 dev 页？~~ → 维持映射
4. ~~**mock 标记形式**~~ → 注释 + data-mock 属性
5. ~~**对齐优先级**~~ → 先核心页
