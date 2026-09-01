---
title: "CHANGELOG"
description: "版本化变更记录（版本-模块-证据）"
id: "CHANGELOG-001"
category: "report"
status: "active"
version: "1.0.0"
created: "2026-02-20"
modified: "2026-04-04"
scope: "全仓库版本变更"
ai-session-types: "all"
ai-priority: "high"
ai-freshness: "realtime"
ai-audiences: "session:all"
tags: "changelog,release"
---

# Agent Project Manager - Changelog

格式约定：每条变更包含 模块 + linked_fr + test_evidence + doc_impact。

## [0.4.5] - 2026-08-30

### 接口测试与契约自动化基建（develop）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | 契约 codegen 链路：Swagger 配置抽 `openapi.document.ts` 与运行时共用，`contract:export`（jest 守卫 spec + template.db 副本）导出 openapi.json（321 paths/102 schemas）入库，`contract:generate` 生成前端契约类型，`contract:check` 临时产物字节比对校验零漂移；9 个 DTO 补齐 @ApiProperty，LinearConfigPayload 手动 $ref 以 ApiExtraModels 注册修复 | FR-CORE-001 | `pnpm contract:check` | `docs/roadmap/stabilization-plan.md` WP1 |
| server | E2E 工作区隔离基建：`test/helpers/ws-app.ts`（template.db 副本一次性工作区 + initTestApp 装配 x-workspace-id→ALS 中间件 + wsRequest 注入工作区头 + ws.db 直连客户端），存量 6 spec 迁移并修复契约漂移断言 | FR-CORE-001 | `pnpm --filter ./apps/server run test:e2e --runInBand`（68 用例全绿） | `docs/roadmap/stabilization-plan.md` WP2 备注 |
| server | 新增 git/document/team/activity 四模块 E2E smoke；修复 auth 凭据错误状态码 400→401（UnauthorizedException.prototype.getStatus() 反模式）、git 根提交 diff 列表 400、task-assignee spec 存量失败（F3 清零） | FR-CORE-001 | `pnpm --filter ./apps/server run test`（184/184） | `CHANGELOG.md` |
| tooling | `api:audit` 完成度清点脚本（openapi.json × e2e 触达路径三态比对，首份报告覆盖 180/413）；coverageThreshold 防劣化基线（11/10/9/11）；quality-gate.yml 与根 quality:gate 接入 contract:check 与 server e2e；修复 quality:gate 前端测试 `--` 分隔符残留 | FR-CORE-001 | `pnpm api:audit` + `pnpm quality:gate` | `.github/workflows/quality-gate.yml` |

## [0.4.7] - 2026-09-01

### pnpm 11 迁移落定（develop）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| infra | pnpm 锚定 11.25.0：lockfile 重新生成为 v9 格式，pnpm-workspace.yaml 以 `allowBuilds` 声明可信构建脚本白名单（bcrypt/esbuild/prisma/msw 等 8 项）；CI workflow 移除硬编码 pnpm 版本改读 packageManager 字段 | FR-CORE-001 | `pnpm quality:gate` 全绿 | `pnpm-workspace.yaml`、`.github/workflows/quality-gate.yml` |

## [0.4.6] - 2026-08-30

### 接口 E2E 覆盖率冲刺 43.6% → 96.4% + 六个真实缺陷修复（develop）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | 新增 14 个接口 E2E 套件（members/users/task-assignees/mentions/task-templates/metadata-roles/iterations/config/notifications/admin/invites/document-bindings/auth-extended/workspaces/runtime/execution/acceptance/plugins/cli-providers/mcp-servers/integrations/ai-hub），endpoint 覆盖 180→398（43.6%→96.4%） | FR-CORE-001 | `pnpm api:audit`（33 套件 276 用例全绿） | `apps/server/test/` |
| server | 修 6 个真实缺陷：AcceptanceModule 重复声明 PrismaService 绕过工作区路由；execution steps 端点写死 system 用户致 403；integrations external-issues 被 :id 路由抢占致 404；task-template PATCH 部分更新清空条目；task-assignees bulk DTO 缺校验；notification preferences channels String 列误写数组；document reference parse 正则 `[^]]` 误用；git clone 拒绝本地路径 remoteUrl | FR-CORE-001 | e2e 276/276 | 对应模块源码 |
| infra | api:audit 支持 `--min` 阈值并接入 quality:gate（钉 95%），防接口覆盖回退；契约零漂移链路照常生效 | FR-CORE-001 | `pnpm quality:gate` | `scripts/api-audit.mjs`、根 `package.json` |

## [0.4.4] - 2026-08-17

### 任务列表对齐 design-system Task Rows（develop）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | 新增 `TaskRowsList` 共享组件（状态分组 GroupRow 可折叠 + 任务行/缩进子任务行 + 组尾 Add task 行，结构与 `/app/design-system#task-rows` 一致） | FR-CORE-001 | `pnpm vitest task-rows` | `apps/frontend/src/modules/task/components/task-rows.tsx` |
| frontend | `/app/tasks` 列表视图由 `TaskListCard` 替换为 `TaskRowsList`（名称列显示项目名，点击/筛选/统计/派发功能不变） | FR-CORE-001 | `pnpm vitest` | `apps/frontend/src/modules/task/pages/tasks-page.tsx` |
| frontend | 项目 Board 标签页列表视图由 4 列 Table 替换为 `TaskRowsList`（点击跳详情、组内新建入口接入现有 inline create） | FR-CORE-001 | `pnpm build` | `apps/frontend/src/modules/project/pages/project-board-page.tsx` |
| frontend | Tasks Workspace（task-page）列表视图同步替换并接入按状态新建；删除旧组件 task-list/task-list-card/task-milestone-badge/sub-task-badge | FR-CORE-001 | `pnpm vitest task-page` | `apps/frontend/src/modules/task/components/index.ts` |

## [0.4.3] - 2026-08-16

### refer 页面级对齐（feat/refer-page-alignment）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | 还原缺失页面 Delivery（交付树三视图/验收矩阵/Agent 状态，dev-only + data-mock） | FR-CORE-001 | `pnpm build` | `apps/frontend/src/modules/delivery/` |
| frontend | 还原缺失页面 Metadata（Labels/Statuses/Roles/Templates 四 Tab，复用 core-config manager，dev-only） | FR-CORE-001 | `pnpm vitest` | `apps/frontend/src/modules/metadata/` |
| frontend | Analytics 对齐 5-Tab 结构（Overview 真实 API + Cost/Quality/Risk/Team mock） | FR-CORE-001 | `pnpm vitest` | `apps/frontend/src/modules/analytics/pages/analytics-page.tsx` |
| frontend | Search 对齐类型过滤/分组/键盘导航（mock 数据） | FR-CORE-001 | `pnpm vitest` | `apps/frontend/src/modules/search/pages/search-page.tsx` |
| docs | AGENTS.md 增补 5.7 页面级对齐约定（mock 规范、dev-only 规范、组件复用映射） | FR-DOC-01 | `pnpm lint` | `apps/frontend/AGENTS.md` |

## [0.4.2] - 2026-08-16

### refer 设计系统还原（feat/refer-design-restore）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | 默认主题预设改为 `figma`（refer 设计 v23），应用启动即呈现 refer 设计 | FR-CORE-001 | `pnpm type-check` | `apps/frontend/src/shared/theme/presets.ts` |
| frontend | Badge/Card/Input/PageHeader/Select 默认样式对齐 refer（保留扩展变体） | FR-CORE-001 | `pnpm vitest` | `apps/frontend/src/components/ui/` |
| frontend | tailwind `xl` 圆角对齐 refer `--radius-xl`；补充 `--input-background`/`--switch-background` 兜底 | FR-CORE-001 | `pnpm build` | `apps/frontend/tailwind.config.js`, `apps/frontend/src/index.css` |
| docs | 新增前端治理手册 `apps/frontend/AGENTS.md`（结构/设计系统架构/组件复用规范） | FR-DOC-01 | `pnpm lint` | `apps/frontend/AGENTS.md` |

## [0.4.1] - 2026-08-16

### CLI Provider / 角色 / MCP-SSE / Linear SDK / 执行恢复 / 文档同步

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| backend | `CliProviderConfig` 模型、CLI Provider 解析链与执行运行面板 | FR-CLI-01 | `pnpm type-check` | `apps/server/prisma/schema.prisma` |
| frontend | MCP/CLI Provider 管理 UI（`feat/cli-provider-module`） | FR-CLI-01 | `pnpm type-check` | `apps/frontend/src/modules/cli-provider/` |
| backend | 角色模块 + Member CLI 绑定字段 + 5 个全局执行角色模板 | FR-RBAC-01 | `pnpm jest` | `apps/server/src/modules/role/` |
| backend | MCP Server 迁移 HTTP/SSE 传输 + 3 个新 CLI Provider 工具 | FR-MCP-01 | `pnpm type-check` | `apps/server/src/modules/mcp-server/` |
| backend | Linear 升级 `@linear/sdk` + 子任务/标签同步 + 幂等绑定 | FR-INT-04 | `pnpm jest integration` | `apps/server/src/modules/integration/providers/linear/` |
| backend | Task 支持 `parentTaskId` 过滤 + 执行恢复 API | FR-TASK-04 | `pnpm type-check` | `apps/server/src/modules/task/` |
| frontend | `/boot` 启动页 + 品牌 Logo 重设计（`chore/boot-brand` 落地） | FR-BOOT-01 | `pnpm vitest` | `apps/frontend/src/modules/boot/` |
| frontend | Design System 展示页面（`feat/frontend-design-system`，仅 dev 模式：Tokens / Primitives / App Components 三大类、28 个 section） | FR-CORE-001 | `pnpm vitest` | `apps/frontend/src/modules/design-system/` |
| docs | CLAUDE/README/architecture 与 cli-provider、role、mcp-sse、linear-sdk 同步 | FR-DOC-01 | `pnpm check:docs-sync` | `docs-sync-manifest.json` |

## [0.4.0] - 2026-07-28

### 内置任务提供商：Linear 完整接入 + Integrations 页面升级

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| backend | Prisma 扩展 Project/Task + 新模型 `TaskProviderLink` / `IntegrationSyncLog` + 迁移 `20260728210000_add_task_provider_link` | FR-INT-04 | `pnpm prisma migrate dev` | `apps/server/prisma/schema.prisma`, `apps/server/prisma/migrations/20260728210000_add_task_provider_link/migration.sql` |
| backend | `EncryptionService`（AES-256-GCM）抽离到 `core/crypto/`，`IntegrationService` 改造为调用 `encryptJson/decryptJson`，新增 `getDecryptedConfig` | FR-INT-04 / P0-SEC-001 | `pnpm jest integration.service.spec.ts` | `apps/server/src/core/crypto/encryption.service.ts`, `apps/server/src/modules/integration/integration.service.ts` |
| backend | 新模块 `LinearClient`（GraphQL + 429/5xx 重试 + `NON_RETRYABLE_LIKE_CODES` 短路）+ `LinearProviderService` + `LinearSyncService`（project 单向 pull + task 双向 sync + hybrid 冲突）+ `LinearController` | FR-INT-04 | `pnpm jest linear-client.spec.ts linear-sync.service.spec.ts integration.service.spec.ts`（19/19 通过） | `apps/server/src/modules/integration/providers/linear/` |
| backend | 字段锁：`ProjectService.update` 校验 `fieldsLockedExternally` 白名单；`TaskService.update` 自动写 `syncStatus='pending'` + `localUpdatedAt` 触发下次 push | FR-INT-04 | `pnpm jest project.service.spec.ts task.service.spec.ts` | `apps/server/src/modules/project/project.service.ts`, `apps/server/src/modules/task/task.service.ts` |
| backend | 消息总线扩展：`linear.sync.completed` / `linear.task.{pulled,pushed,conflict,resolved}`；`EventsGateway` 增 project 房间 join/leave 协议 | FR-INT-04 | `pnpm type-check` | `apps/server/src/core/message-bus/message-bus.service.ts`, `apps/server/src/gateways/events.gateway.ts` |
| frontend | 新模块 `modules/linear/`（API + hooks + 配置表单 + 状态徽章 + provider card + 冲突解决 + 同步日志抽屉 + Task 外部面板） | FR-INT-04 | `pnpm vitest run src/modules/integration`（3/3 通过） | `apps/frontend/src/modules/linear/` |
| frontend | `IntegrationListPage` 升级为 Built-in / Installed / Marketplace 三 Tab；Linear 渐变深色 hero 卡 + Jira "Coming Soon" 占位 | FR-INT-04 | `pnpm vitest run integration-list-page.test.tsx` | `apps/frontend/src/modules/integration/pages/integration-list-page.tsx`, `apps/frontend/src/modules/integration/constants/builtin-providers.tsx` |
| frontend | Project 设置/详情/Board/Team 注入 Linear 同步状态徽章 + Sync 按钮 + `LinearSyncLogDrawer`；Task 详情右栏新增 External 分组 | FR-INT-04 | `pnpm type-check` | `apps/frontend/src/modules/project/components/project-linear-sync-status.tsx`, `apps/frontend/src/modules/task/pages/task-detail-page.tsx` |
| frontend | 前端 Socket 订阅：`eventClient` 增 `joinProject/leaveProject`；`useLinearSyncEvents` 自动 invalidate 任务 + 冲突 toast | FR-INT-04 | `pnpm type-check` | `apps/frontend/src/infrastructure/event-client/index.ts`, `apps/frontend/src/modules/linear/hooks/use-linear-events.ts` |
| docs | `docs/02-架构设计/architecture/linear-sync-design.md` 新建架构设计文档；P3-007 勾选 Linear 部分 + Jira "Coming Soon" | FR-INT-04 | n/a | `docs/02-架构设计/architecture/linear-sync-design.md`, `docs/roadmap/tasks-phase1-3.md` |

## [0.3.8] - 2026-06-16

### APM 文档模块重构 v1（7 项调整落地）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| shared | 新增 `useToastMutation` / `useActionWithToast`: 统一 mutation 成功/失败 toast 反馈 | FR-DOC-07 | `pnpm type-check` | `apps/frontend/src/shared/hooks/use-action-with-toast.ts` |
| frontend | 删除 `MarkdownLite`, 编辑/查看页统一走 `MdxRenderer` | FR-DOC-01 | `pnpm type-check` | `apps/frontend/src/modules/document/components/markdown-lite.tsx` |
| shared | 升级 MDX 工具链: 接入 `rehype-highlight` / `rehype-external-links` / `remark-gfm` 完整 GFM | FR-DOC-01 | `vitest mdx-pipeline.test.ts` (7) | `apps/frontend/src/shared/mdx/mdx-pipeline.ts` |
| frontend | CodeMirror 6 编辑器 + 工具栏, `MdxEditorRef` 暴露 insert/wrap/focus | FR-DOC-01 | `pnpm type-check` | `apps/frontend/src/modules/document/components/mdx-editor.tsx` |
| shared | 标题组件悬浮: H{level} 徽章 / 复制锚点 / 复制为 Markdown / 折叠子标题, 全部按钮走 `useActionWithToast` | FR-DOC-02 | `pnpm type-check` | `apps/frontend/src/shared/mdx/components/mdx-heading.tsx` |
| frontend | 目录缩进按 H1-H6 真实 level 计算, 跳级按 parentLevel 栈降级 | FR-DOC-02 | `pnpm type-check` | `apps/frontend/src/modules/document/components/section-navigation.tsx` |
| backend | `Project.documentsRepoPath` 字段 + `PUT /projects/:id/docs-storage` 端点 | FR-DOC-03 | `pnpm type-check` | `apps/server/src/modules/project/` |
| backend | `DocsGitService` 走 `child_process.execFile` 调用 git CLI, 提供 commitFile / listCommits / restoreFile | FR-DOC-03 | `pnpm type-check` | `apps/server/src/modules/document/services/docs-git.service.ts` |
| backend | `DocumentVersionService` 集成 Git 同步层, 新增 `renameVersion` + 回滚为新版本 | FR-DOC-03 | `pnpm type-check` | `apps/server/src/modules/document/services/document-version.service.ts` |
| backend | `ProjectModule` 表 + `ProjectModuleController` (CRUD); 校验 `^[A-Z]{2,4}$` | FR-DOC-04 | `pnpm type-check` | `apps/server/prisma/schema.prisma`, `apps/server/src/modules/project/` |
| backend | `ProjectSequence` 表 + `TaskIdService.nextShortId` 原子递增; Bug/Task 共享计数器 | FR-DOC-04 | `jest task-id.service.spec.ts` (3) | `apps/server/src/modules/task/services/task-id.service.ts` |
| backend | `Task.shortId @unique` 字段, `CreateTaskDto.moduleCode` 必填 | FR-DOC-04 | `pnpm type-check` | `apps/server/prisma/schema.prisma` |
| frontend | `ProjectModuleManager` UI + `useProjectModules` 钩子 (CRUD) | FR-DOC-04 | `pnpm type-check` | `apps/frontend/src/modules/project/components/project-module-manager.tsx` |
| frontend | 所有 Task/Bug 列表 + 详情显示 `task.shortId`, 看板卡片 + 关联卡片 + 详情 drawer | FR-DOC-04 | `pnpm type-check` | `apps/frontend/src/modules/task/`, `apps/frontend/src/modules/document/components/document-task-links.tsx` |
| frontend | `TaskDetailDrawer` 新增"关联文档" tab + `DocumentPickerDialog` 反向选择 | FR-DOC-04 | `pnpm type-check` | `apps/frontend/src/modules/task/components/task-detail-drawer.tsx`, `apps/frontend/src/modules/document/components/document-picker-dialog.tsx` |
| shared | `mdx-frontmatter` 升级 Obsidian 兼容子集: tags/aliases/status/project/module/short_id/custom 桶 | FR-DOC-05 | `vitest mdx-frontmatter.test.ts` (8) | `apps/frontend/src/modules/document/services/mdx-frontmatter.ts` |
| frontend | `metadata-sync.service` 读时同步 frontmatter → DocumentTag (单向, 不写回) | FR-DOC-05 | `pnpm type-check` | `apps/frontend/src/modules/document/services/metadata-sync.service.ts` |
| frontend | `DocumentTagManager` 取消"管理全部标签" 折叠, 改为只读 + frontmatter 提示 | FR-DOC-05 | `pnpm type-check` | `apps/frontend/src/modules/document/components/document-tag-manager.tsx` |
| frontend | 文档编辑页标签输入框改为只读展示, 提示用户编辑 frontmatter | FR-DOC-05 | `pnpm type-check` | `apps/frontend/src/modules/document/pages/document-edit-page.tsx` |
| frontend | 所有 mutation 钩子 (`useCreateDocument` / `useUpdateDocument` / `useDeleteDocument` / `useAttachTag` / 等) 走 `useToastMutation`, 必传 `successMessage` | FR-DOC-06 | `pnpm type-check` | `apps/frontend/src/modules/document/hooks/` |
| test | 服务端 task.service.spec.ts 11/11 通过; 任务 ID 生成测试 3/3 通过 | — | `jest` | `apps/server/src/modules/task/` |
| test | 前端 mdx-pipeline 7/7 + mdx-frontmatter 8/8 | — | `vitest` | `apps/frontend/src/` |

## [0.3.7] - 2026-05-30

### Phase 2 Trust & Context 模块实现

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| backend | 新增 TrustModule (TrustService): 信任档案管理、三层评估管道、角色驱动指标、信任分计算 | FR-TRUST-01~06 | `pnpm type-check` | `apps/server/src/modules/trust/` |
| backend | 新增 ContextModule (ContextService): 四层上下文构建、配方系统、自动策展、Token预算管理 | FR-CTX-01~10 | `pnpm type-check` | `apps/server/src/modules/context/` |
| backend | 更新 app.module.ts 导入 TrustModule 和 ContextModule | — | `pnpm type-check` | `apps/server/src/app.module.ts` |

### Tier 2 前端功能实现

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | 新增 ContextPreviewDialog: 四层上下文预览、Token用量条、可折叠区块 | FR-CTX-04 | `pnpm type-check` | `apps/frontend/src/modules/task/components/context-preview-dialog.tsx` |
| frontend | 更新 TaskAiSuggestionTab 集成 ContextPreviewButton | FR-CTX-04 | `pnpm type-check` | `apps/frontend/src/modules/task/components/task-detail-tabs.tsx` |
| frontend | 新增 BatchCreateTasksDialog: 批量创建任务（手动/模板/AI生成三种模式） | FR-TK-BATCH | `pnpm type-check` | `apps/frontend/src/modules/task/components/batch-create-tasks-dialog.tsx` |
| frontend | 更新 TaskPage 添加 Batch Create 按钮和 Dialog 集成 | FR-TK-BATCH | `pnpm type-check` | `apps/frontend/src/modules/task/pages/task-page.tsx` |

## [0.3.6] - 2026-05-30

### 前端模块完善与 Onboarding 向导实现

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | Tier 1: 创建 Onboarding Wizard 5步向导（欢迎→创建项目→连接仓库→配置AI→完成） | FR-CORE-001 | `pnpm type-check` | `apps/frontend/src/modules/onboarding/` |
| frontend | Tier 1: 创建 use-onboarding.ts hook（步骤管理、状态持久化、API集成） | FR-CORE-001 | `pnpm type-check` | `apps/frontend/src/modules/onboarding/hooks/use-onboarding.ts` |
| frontend | Tier 1: 创建 sprint-page.tsx 及 Sprint 管理组件（sprint-list.tsx, sprint-dialog.tsx） | FR-TK-04 | `pnpm type-check` | `apps/frontend/src/modules/project/pages/sprint-page.tsx` |
| frontend | Tier 1: 创建 execution-recovery-dialog.tsx（5种恢复选项：重试/重试步骤/调整参数/转交人工/放弃） | FR-AI-05 | `pnpm type-check` | `apps/frontend/src/modules/execution/components/execution-recovery-dialog.tsx` |
| frontend | Tier 1: 检查任务讨论/活动流 TaskActivity（已正确实现于 task-detail-drawer.tsx） | FR-TK-06 | — | — |
| frontend | Phase 2: 验证 Git 模块后端服务完整性（GitService, GitToolService, ProjectWorkspaceService, GitCommandService） | FR-GT-01 | — | — |
| frontend | Phase 2: 验证 Terminal 模块后端服务完整性（TerminalService） | FR-TERM-01 | — | — |
| frontend | Phase 3: 验证 AIExecutionCenterPage 实现完整性（执行队列/审批中心/信任管理） | FR-AI-02 | — | — |
| frontend | Phase 4: 验证 Plugin 前端模块完整性（api, hooks, components） | FR-PL-01 | — | — |
| infrastructure | 新增 onboardingCompleted 状态到 AppStore（支持 onboarding 流程持久化） | FR-CORE-001 | `pnpm type-check` | `apps/frontend/src/infrastructure/store/app-store.ts` |

## [0.3.5] - 2026-05-29

### 文档结构重组与前端 Tier 1 实现

|| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|| --- | --- | --- | --- | --- |
|| docs | 文档重组：创建根目录 CLAUDE.md, architecture.md, PRD.md | FR-CORE-001 | — | `CLAUDE.md`, `architecture.md`, `PRD.md` |
|| docs | 文档重组：创建 docs/modules/ 目录（10个模块README） | FR-CORE-001 | — | `docs/modules/*/README.md` |
|| docs | 文档重组：创建 docs/design/ 目录（设计入口、设计系统、UI约束） | FR-CORE-001 | — | `docs/design/*.md` |
|| docs | 更新 docs/INDEX.md 索引 | FR-CORE-001 | — | `docs/INDEX.md` |
|| frontend | Tier 1: Task Detail Sheet 新增 4 Tab（执行记录/审批记录/AI建议/讨论） | FR-TK-06, FR-TK-07 | — | `apps/frontend/src/modules/task/components/task-detail-drawer.tsx` |
|| frontend | Tier 1: 新增 AIExecutionCenterPage（执行队列/审批中心/执行回放/信任管理） | FR-AI-02, FR-AI-05 | — | `apps/frontend/src/modules/ai-hub/pages/ai-execution-center-page.tsx` |
|| frontend | 路由：新增 /app/ai/executions 路由 | FR-AI-02 | — | `apps/frontend/src/app/router.tsx` |
|| frontend | Git: 新增 BindRepositoryDialog 组件 | FR-GT-01 | — | `apps/frontend/src/modules/git/components/bind-repository-dialog.tsx` |
|| frontend | Git: 更新 RepositoryListPage 添加绑定仓库入口 | FR-GT-01 | — | `apps/frontend/src/modules/git/pages/repository-list-page.tsx` |
|| frontend | Plugins: 创建前端模块目录结构 | FR-PL-01 | — | `apps/frontend/src/modules/plugins/` |

## [0.3.4] - 2026-05-17

### 基线修复、文档补齐、工程健壮性与环境切换

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| logging | 统一日志系统：Tauri 插件收集前后端日志，前端 shared/lib/logger 转发 console，后端 standalone 模式结构化格式 | FR-CORE-001 | `pnpm type-check`, `pnpm -r lint` | — |
| desktop | 移除 Tauri 硬编码路径，debug 使用 CARGO_MANIFEST_DIR，release 基于可执行文件位置 | FR-CORE-001 | `cargo check` 通过 | — |
| desktop | 配置 CSP 安全策略（允许 WebSocket、API、OpenAI 连接），打包后端 dist 和 prisma 资源 | FR-CORE-001 | `cargo check` 通过 | — |
| test | 修复 analytics-panel 和 documents-page 测试失败（PointerEvent polyfill + 断言调整） | FR-ANALYTICS-001, FR-DOCUMENT-001 | 前端测试 82/82 通过 | — |
| test | 新增 GitService 单元测试 12 条（CRUD、权限检查、MessageBus 事件） | FR-GIT-001 | 后端测试 117/117 通过 | — |
| docs | 新增 command-palette 三层文档（需求+契约+API），settings 和 analytics 需求文档 | FR-COMMAND-PALETTE-001, FR-SETTINGS-001, FR-ANALYTICS-001 | doc-coverage 检查 | `docs/meta/requirements/feature-*.md`, `docs/meta/contracts/command-palette.md`, `docs/api/api-command-palette.md` |
| docs | 新增 GIT-WORKFLOW.md（分支策略、版本标签、合并流程、提交规范） | FR-CORE-001 | — | `docs/meta/GIT-WORKFLOW.md` |
| docs | 更新追踪矩阵（+3 FR）、INDEX.md（+2 条目）、AGENTS.md（+4 模块） | FR-CORE-001 | 追踪矩阵核对 | 多文件 |
| ci | 新增 doc-coverage 自动检查脚本，加入 quality-gate CI | FR-CORE-001 | `node scripts/check-doc-coverage.mjs` | `scripts/check-doc-coverage.mjs`, `.github/workflows/quality-gate.yml` |
| ci | 新增 release.yml（tag push 触发自动构建和 NSIS 发布） | FR-CORE-001 | — | `.github/workflows/release.yml` |
| build | 新增 .env.production.example 和 build-desktop.ps1 构建脚本 | FR-CORE-001 | — | `apps/server/.env.production.example`, `scripts/build-desktop.ps1` |
| git | 创建版本标签 v0.1.0 ~ v0.3.3 | — | — | — |

## [0.3.3] - 2026-04-04

### Documentation Governance & Desktop Migration Alignment

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| docs/index | 重建文档索引并新增 Desktop 迁移状态导航（current/transition/legacy） | FR-CORE-001 | `pnpm check:docs-sync` | `docs/INDEX.md` |
| docs/desktop | 建立 Tauri 主线文档包（架构、runbook、发布回滚、路线图、验收清单） | FR-CORE-001 | 文档一致性人工校验 | `docs/architecture/desktop-tauri-architecture-v1.md`, `docs/guides/desktop-tauri-*.md`, `docs/reports/desktop-tauri-*.md` |
| docs/legacy | Electron 文档降级与归档基线合并 | FR-CORE-001 | 文档一致性人工校验 | `docs/archive/guides/desktop-electron-baseline.md`, `docs/guides/desktop-electron-runbook.md`, `docs/reports/release-notes-desktop-v0.1.0.md` |
| docs/contracts | 补齐模块缺口文档（runtime/iteration/config/task-template）并统一 plugin/plugins 命名说明 | FR-CORE-001 | 追踪矩阵核对 | `docs/meta/requirements/feature-*.md`, `docs/meta/contracts/*.md`, `docs/api/api-*.md`, `docs/reports/traceability-matrix.md` |
| governance | 新增 ADR-011（Electron -> Tauri 迁移决策） | FR-CORE-001 | 文档一致性人工校验 | `docs/meta/decision-log.md` |
| cleanup | 新增软删除候选清单（含文档与非文档产物） | FR-CORE-001 | 清单审阅 | `docs/reports/doc-cleanup-soft-delete-candidates-2026-04-04.md` |

## [0.3.2] - 2026-03-24

### Documentation Architecture Upgrade

| 模块      | 变更                                                                                                       | linked_fr        | test_evidence                   | doc_impact                                                                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| docs/meta | PRD 新增“文档管理与上下文治理层”与 V2 文档管理专项（实体、章节、版本、关联、AI 治理）                       | FR-DOCUMENT-001  | 文档一致性人工校验              | `docs/meta/PRD.md`                                                                                                                                                                      |
| docs/meta | 新增 Document 模块需求文档，定义 FR-DOC-01~07                                                              | FR-DOCUMENT-001  | 文档一致性人工校验              | `docs/meta/requirements/feature-document.md`                                                                                                                                            |
| docs/meta | Project/Task/AI Hub 需求文档补充文档章节关联与 AI 文档治理需求                                              | FR-PROJECT-001, FR-TASK-001, FR-AIHUB-001 | 文档一致性人工校验              | `docs/meta/requirements/feature-project.md`, `docs/meta/requirements/feature-task.md`, `docs/meta/requirements/feature-ai-hub.md`                                                     |
| contracts | 新增 Document 模块契约并更新 Project/Task/AI Hub 契约以支持章节级关联与 AI 文档写入提案                    | FR-DOCUMENT-001  | 文档一致性人工校验              | `docs/meta/contracts/document.md`, `docs/meta/contracts/project.md`, `docs/meta/contracts/task.md`, `docs/meta/contracts/ai-hub.md`                                                  |
| api       | 新增 `api-document.md`，并更新 `api-project.md`、`api-core.md`、`api-ai-hub.md` 以覆盖文档聚合、任务章节关联与 AI 写入审批 | FR-DOCUMENT-001  | OpenAPI/契约文档人工审阅        | `docs/api/api-document.md`, `docs/api/api-project.md`, `docs/api/api-core.md`, `docs/api/api-ai-hub.md`                                                                              |
| arch      | 架构总览加入 `document` 模块与文档契约；新增文档管理架构细化文档                                             | FR-DOCUMENT-001  | 架构文档人工审阅                | `docs/architecture/overview.md`, `docs/architecture/document-management-v2.md`                                                                                                         |
| reports   | 追踪矩阵新增 FR-DOCUMENT-001 映射                                                                            | FR-DOCUMENT-001  | 追踪矩阵检查                    | `docs/reports/traceability-matrix.md`                                                                                                                                                   |

## [0.3.1] - 2026-03-14

### Governance

| 模块       | 变更                                                                                              | linked_fr   | test_evidence                                       | doc_impact                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| governance | 新增质量门禁与文档同步阻断机制（PR模板+CI+docs-sync）                                             | FR-CORE-001 | `pnpm type-check`, `pnpm -r lint`, 前后端测试主命令 | `docs/meta/QUALITY-GATE.md`, `docs/meta/contracts/*`                                                                                                |
| docs       | 重建 PRD、模板体系与追踪矩阵                                                                      | FR-CORE-001 | 追踪矩阵与文档校验                                  | `docs/meta/PRD.md`, `docs/meta/templates/*`, `docs/reports/traceability-matrix.md`                                                                  |
| process    | GOV-001 验收：TODO 真相源切换到 `docs/reports/TODO.md` 并冻结根 TODO 写入                         | FR-CORE-001 | 人工核验根 `TODO.md` 归档状态                       | `docs/reports/TODO.md`, `TODO.md`, `docs/reports/DONE.md`                                                                                           |
| process    | GOV-002 归档流程固化：定义 TODO -> DONE -> CHANGELOG 一致性步骤                                   | FR-CORE-001 | 文档流程校验                                        | `docs/guides/todo-done-changelog-workflow.md`                                                                                                       |
| process    | GOV-003 启动首份治理周报机制                                                                      | FR-CORE-001 | 周报模板与首份周报落地                              | `docs/reports/review-reports/weekly-governance-2026-03-14.md`                                                                                       |
| process    | GOV-004 覆盖率周推进机制落地                                                                      | FR-CORE-001 | 周目标表创建并纳入治理机制                          | `docs/reports/coverage-weekly-targets-2026-03-14.md`                                                                                                |
| docs       | DOC-005 文档链接全量巡检与失效路径修复                                                            | FR-CORE-001 | 本地链接复扫 `BROKEN_COUNT=0`                       | `docs/reports/review-reports/doc-link-audit-2026-03-14.md`                                                                                          |
| docs       | DOC-001~004 收口：PRD 签字、7模块需求 GWT/边界补齐、7模块契约接口/状态/异常补齐、追踪矩阵证据回填 | FR-CORE-001 | 文档字段扫描通过 + QA 模块测试报告                  | `docs/reports/review-reports/prd-signoff-2026-03-14.md`, `docs/meta/requirements/*`, `docs/meta/contracts/*`, `docs/reports/traceability-matrix.md` |

### Quality

| 模块     | 变更                                                                  | linked_fr                                         | test_evidence                                                                              | doc_impact                                                                                                                           |
| -------- | --------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| server   | 清理 `src` 误入 `.js` 产物，恢复 TS 源一致性                          | FR-CORE-001                                       | server unit test 77/77                                                                     | `docs/reports/review-reports/project-rescue-baseline-2026-03-14.md`                                                                  |
| frontend | 修复 `use-project-health` 测试断言结构漂移                            | FR-PROJECT-001                                    | frontend test 31/31                                                                        | `docs/reports/traceability-matrix.md`                                                                                                |
| quality  | QA-001/002/003 补齐 ai-hub/integration/terminal 服务层专项测试证据    | FR-AIHUB-001, FR-INTEGRATION-001, FR-TERMINAL-001 | `pnpm test -- ai-hub.service.spec.ts integration.service.spec.ts terminal.service.spec.ts` | `docs/reports/test-reports/qa-module-tests-2026-03-14.md`, `docs/reports/traceability-matrix.md`                                     |
| frontend | UI-001 首轮兼容台账清点 + UI-003 依赖退场清单冻结 + UI-004 里程碑冻结 | FR-PROJECT-001                                    | 台账/计划文档校验                                                                          | `docs/reports/ui-compatibility-register.md`, `docs/reports/ui-radix-exit-register-2026-03-14.md`, `docs/reports/ui-refactor-plan.md` |
| server   | 修复开发环境 JWT 守卫放行导致 `request.user` 丢失的问题，恢复鉴权链路 | FR-CORE-001                                       | `pnpm type-check`, `pnpm test -- auth.service.spec.ts`                                     | `apps/server/src/modules/auth/guards/jwt-auth.guard.ts`, `docs/reports/ui-regression-report-2026-03-14.md`                           |
| frontend | UI-002/UI-005 收口：三页回归截图归档并解除阻塞                        | FR-PROJECT-001                                    | `pnpm -s exec vitest --run`                                                                | `docs/reports/ui-component-consistency-2026-03-14.md`, `docs/reports/ui-regression-report-2026-03-14.md`, `docs/reports/ui-*.png`    |
| release  | REL-001/REL-002 收口：0.3.1 证据回填与下一周期风险 Backlog 更新       | FR-CORE-001                                       | 版本记录与 backlog 一致性校验                                                              | `CHANGELOG.md`, `docs/reports/BACKLOG.md`, `docs/reports/DONE.md`                                                                    |

## [0.3.0] - 2026-03-06

### Project & AI Integration

| 模块       | 变更                                                 | linked_fr      | test_evidence                      | doc_impact                                                             |
| ---------- | ---------------------------------------------------- | -------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| project    | 新增 external-links/doc-links/api-doc-links 管理能力 | FR-PROJECT-001 | project service/unit + e2e         | `docs/meta/requirements/feature-project.md`                            |
| project    | 新增健康度快照与 AI context 刷新能力                 | FR-PROJECT-001 | project hooks + backend controller | `docs/meta/requirements/feature-project.md`, `docs/api/api-project.md` |
| ai-project | AI 项目级配置、执行、洞察模型扩展                    | FR-AIHUB-001   | 待补专项自动化测试                 | `docs/meta/requirements/feature-ai-project.md`                         |

## [0.2.0] - 2026-02-20

### Security & Foundation

| 模块        | 变更                                | linked_fr   | test_evidence                    | doc_impact    |
| ----------- | ----------------------------------- | ----------- | -------------------------------- | ------------- |
| integration | 修复加密密钥硬编码与加密 API 安全性 | FR-CORE-001 | lint + build + integration tests | 安全审计报告  |
| server      | CORS 白名单与限流防护增强           | FR-CORE-001 | e2e 回归                         | 架构/安全文档 |
| infra       | `src/common` 基础设施层建设         | FR-CORE-001 | unit/e2e                         | 架构文档      |

## 维护规则

1. 每个版本条目必须包含 `linked_fr`。
2. 每个版本条目必须包含可验证证据（测试命令/报告路径）。
3. 接口或模型变化必须同步更新 `docs/api/*` 与 `docs/reports/traceability-matrix.md`。
