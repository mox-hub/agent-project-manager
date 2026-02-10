## Agent Project Manager 功能模块实现顺序与 TODO 计划

> 依据 `docs/architecture-design.md`、`architecture-frontend.md`、`architecture-backend.md` 及 `docs/feature-design/*` 汇总整理，假设当前前后端基础脚手架已搭建完成（`apps/frontend` + `apps/server`）。

---

## 1. 总体实现原则与模块依赖

- **总体优先级**：先打稳基础设施和安全基线，再实现“项目 / 任务”核心流，然后接入 AI 与开发者工具链（Git / Terminal / 集成），最后再做插件生态与企业增强。
- **关键依赖关系（简化）**：
  - `Core` → 依赖所有业务模块（配置、日志、MessageBus、数据库）。
  - `User/Auth` → 提供用户与 RBAC，`Project` / `AIHub` / `Git` / `Terminal` / `Plugin` 等都依赖。
  - `Project-Metadata` → 为 `Project` / `Task` / `Notification` / `AIHub` 提供标签、状态、模板。
  - `Project` → 为 `AIHub` / `Git` / `Terminal` / `Integration` / `Notification` 提供项目上下文。
  - `AIHub` → 依赖 `Project`、`Git`、`Terminal`、`Integration` 作为上下文来源。
  - `Git` / `Terminal` / `Integration` / `Notification` → 依赖 `Core` + `Project` + `User/Auth`。
  - `Plugin` → 依赖几乎所有模块暴露的 Plugin API，是“最后一层扩展”。

---

## 2. 分阶段模块实现顺序概览

结合架构设计中的路线图（`architecture-design.md` 第 11 章）与前后端实现建议，建议按以下阶段推进：

1. **Phase 0（已完成/进行中）**：Monorepo 脚手架 + 基础前后端工程（Vite React / NestJS）。
2. **Phase 1：Core & User/Auth & Project-Metadata 基础设施**  
   - 模块：`Core`、`User/Auth`、`Auth-OAuth2`（只做最小闭环）、`Project-Metadata`。
3. **Phase 2：Project 核心（项目 / 任务 / 迭代）**  
   - 模块：`Project`，前后端完整 CRUD 与列表 / 看板视图。
4. **Phase 3：AIHub MVP（对话 + 基础上下文）**  
   - 模块：`AIHub`，支持与项目/任务关联的 AI 对话，预留工作流接口。
5. **Phase 4：Git & Terminal 深度集成**  
   - 模块：`Git`、`Terminal`，打通代码与命令上下文。
6. **Phase 5：Integration & Notification（外部工具与通知中心）**  
   - 模块：`Integration`、`Notification`，支撑日报/周报与 CI/IM 集成。
7. **Phase 6：Plugin 生态与扩展点**  
   - 模块：`Plugin`，打通前后端扩展能力。
8. **Phase 7：OAuth2 企业增强 & 高级特性完善**  
   - 完善 `Auth-OAuth2`、团队协作、企业部署相关细节。

下面各小节给出每个阶段的 **模块范围 + 核心 TODO 清单**（按后端 / 前端拆分），方便拆分到具体 Sprint。

---

## 3. Phase 1：Core & User/Auth & Project-Metadata

### 3.1 目标与范围

- 建立**可运行且安全的后端基础设施**，提供统一配置、日志、数据库与消息总线。
- 打通**用户登录 + 会话 + RBAC**，让前端能以登录态访问受保护 API。
- 提供基础的**标签 / 状态 / 模板元数据**，为 Project/Task 等模块做准备。

### 3.2 后端 TODO（apps/server）

- **Core 模块（Config / Logger / Database / MessageBus）**
  - [ ] 按 `architecture-backend.md` 实现 `ConfigModule`（环境变量校验、配置读取）。
  - [ ] 实现 `LoggerModule` 与结构化日志（Console + 文件），接入 Nest 全局 Logger。
  - [ ] 实现 `DatabaseModule` + `PrismaService`，完成基础 Prisma 配置与数据库连接。
  - [ ] 实现 `MessageBusModule`（发布 / 订阅、事件类型约定），与后续模块解耦。
  - [ ] 接入全局异常过滤器与响应格式（`/_api` 前缀 + 统一错误结构）。

- **User/Auth 模块（本地登录 + JWT）**
  - [ ] 根据 `feature-user-auth.md` 与 `api-user-auth.md` 建模 `User` / `RoleAssignment` / `Session`。
  - [ ] 实现 `AuthModule`（本地用户名+密码登录、JWT 策略、守卫、中间件）。
  - [ ] 实现 `GET /_api/auth/me` 与基础用户信息接口。
  - [ ] 在 `AppModule` 中挂载 `JwtAuthGuard` 作为全局守卫（保留 `@Public` 例外）。

- **Project-Metadata 模块**
  - [ ] 按 `feature-project-metadata.md` 与 `model-project-metadata.md` 定义 `Tag` / `StatusDefinition` / `ProjectTemplate` 等模型。
  - [ ] 实现读取接口（如 `GET /_api/metadata/tags` / `statuses` / `templates`）。
  - [ ] 实现基础写入接口（仅管理员 / Owner），为 Phase 2 `Project` 模块使用。

- **Auth-OAuth2 最小骨架**
  - [ ] 按 `feature-auth-oauth2.md` 与 `api-auth-oauth2.md`，定义 Provider 配置模型。
  - [ ] 实现 `GET /_api/auth/oauth2/providers`，返回当前配置的 Provider 列表。
  - [ ] 预留 `/authorize` / `/callback` 路由（可先返回未实现或简单 Mock），后续 Phase 7 完成。

### 3.3 前端 TODO（apps/frontend）

- **基础设施**
  - [ ] 在 `src` 中按 `architecture-frontend.md` 建立 `app/`、`modules/`、`shared/`、`infrastructure/` 目录结构。
  - [ ] 实现统一 `api-client`（HTTP 封装）与 `event-client`（WebSocket 封装）。
  - [ ] 实现全局状态（如 `useAppStore`），持久化基础 UI 状态。

- **Auth 模块（前端）**
  - [ ] 在 `modules/auth` 下实现登录页、`AuthGuard`、当前用户获取逻辑（对接 `/_api/auth/login`、`/me`）。
  - [ ] 实现基础登录 / 登出流程与错误提示。

- **Shell 布局与路由框架**
  - [ ] 按 `architecture-frontend.md` 3.1 节实现 `ShellLayout`（侧边栏 / 顶栏 / 状态栏）。
  - [ ] 建立顶层路由（`/login` / `/app` 等），接入 `AuthGuard`。

- **元数据读取**
  - [ ] 在 `modules/core-config` 或 `modules/project` 内实现获取标签 / 状态 / 模板的前端 API Hook。
  - [ ] 在全局或 Project 创建表单中简单使用这些元数据（如状态下拉、标签选择）。

---

## 4. Phase 2：Project 核心（项目 / 任务 / 迭代）

### 4.1 目标与范围

- 完成**项目与任务管理**的第一版，使系统具备“项目入口 + 任务看板 / 列表 + 任务详情”的基础能力。
- 建立**项目仪表盘**与基本统计，为后续 AI 分析与 Git/CI 集成打基础。

### 4.2 后端 TODO（apps/server）

- **数据模型与 Prisma**
  - [ ] 按 `model-project.md` 与 `architecture-backend.md` 中示例完善 `Project` / `ProjectMember` / `Task` / `Iteration` 等模型。
  - [ ] 编写迁移脚本与基础 Seed 数据（示例项目与任务）。

- **Project 模块 API**
  - [ ] 实现 `ProjectModule` / `TaskModule` 服务层与控制器（参考后端文档中的示例实现）。
  - [ ] 暴露核心接口（对应 `api-project.md`）：
    - [ ] `GET /_api/projects` / `POST /_api/projects` / `GET /_api/projects/:id`。
    - [ ] `GET /_api/projects/:projectId/tasks` / `POST /_api/tasks` / `GET /_api/tasks/:taskId`。
    - [ ] 基础迭代接口（如 `GET /_api/projects/:projectId/iterations`）。
  - [ ] 与 `Project-Metadata` 集成（状态 / 标签 / 模板创建项目时生效）。
  - [ ] 通过 `MessageBus` 发送 `project.created` / `project.updated` / `task.created` / `task.updated` 事件。

### 4.3 前端 TODO（apps/frontend）

- **Project 模块结构**
  - [ ] 在 `modules/project` 下建立 `api/`、`hooks/`、`components/`、`pages/` 目录。
  - [ ] 实现对应 `api-project.md` 的前端 API 与 React Query Hook（参考 `architecture-frontend.md` 示例）。

- **页面与交互**
  - [ ] `ProjectListPage`：项目列表、搜索与过滤、创建项目弹窗。
  - [ ] `ProjectDashboardPage`：项目概览卡片、基本统计、任务/迭代摘要。
  - [ ] `TaskBoardPage`：任务看板（按状态列）、过滤工具条（负责人 / 标签 / 状态等）。
  - [ ] `TaskDetailDrawer`：任务详情编辑、依赖关系、活动记录基础 Tab。

- **与 Phase 1 的集成**
  - [ ] 将项目选择 / 当前项目 ID 与全局 Store 集成（导航与状态栏显示当前项目）。
  - [ ] 基于 `MessageBus` 推送的 `project.updated` / `task.updated`（后续阶段）预留订阅接口。

---

## 5. Phase 3：AIHub MVP（对话 + 基础上下文）

### 5.1 目标与范围

- 提供**与项目 / 任务上下文关联的 AI 对话能力**，成为产品可见的第一版 AI 功能。
- 支持**流式输出与基础工作流接口**，为之后的代码审查 / 报表 / 智能诊断打基础。

### 5.2 后端 TODO（apps/server）

- **AIHub 数据模型与服务**
  - [ ] 根据 `model-ai-hub.md` 定义 `AIConversation` / `AIMessage` / `AIModel` / `AIWorkflow*` 基础模型。
  - [ ] 实现 `AiHubModule`：模型适配器注册、上下文构建器、会话存储逻辑（参考后端文档示例实现）。

- **AI Chat 接口与流式输出**
  - [ ] 实现 `POST /_api/ai/chat`，支持 `projectId` / `taskId` / `conversationId` 作为上下文。
  - [ ] 通过 `MessageBus` 推送 `ai.stream` 事件，并在 `EventsGateway` 中广播到前端。
  - [ ] 按 `feature-ai-hub.md` 设计落地最小化的模型路由策略（可先只接一型模型）。

- **基础工作流接口**
  - [ ] 定义 `AIWorkflowDefinition` / `AIWorkflowRun` 表结构。
  - [ ] 实现 `POST /_api/ai/workflows/run` 与基础状态更新逻辑（`ai.workflow.update` 事件）。

### 5.3 前端 TODO（apps/frontend）

- **AI 模块结构**
  - [ ] 在 `modules/ai-hub` 下实现前端 API 与 Hook，覆盖 `api-ai-hub.md` 中的核心接口。

- **AI 对话 UI**
  - [ ] `AiSpacePage`：会话列表 + 聊天区域 + 右侧上下文面板（项目 / 任务摘要）。
  - [ ] `AiChatPanel`：输入区、多消息展示、流式 token 渲染（订阅 `ai.stream`）。
  - [ ] 在 `TaskDetailDrawer` 中增加 AI Tab（任务上下文内对话）。

- **基础工作流视图**
  - [ ] `WorkflowListPage` 与 `WorkflowRunDetailPage`：列表与运行详情，订阅 `ai.workflow.update`。

---

## 6. Phase 4：Git & Terminal 深度集成

### 6.1 目标与范围

- 打通**代码提交 / 分支 / PR 与项目 / 任务 / AI** 的闭环。
- 提供**内置终端**，支撑“命令 → 输出 → AI 诊断”的工作流。

### 6.2 后端 TODO（apps/server）

- **Git 模块**
  - [ ] 按 `feature-git.md` 与 `api-git.md` 定义 `Repository` / `Commit` / `Diff` 模型。
  - [ ] 实现仓库绑定与管理接口：`GET/POST /_api/git/repos`、`/status`、`/commits`、`/diff` 等。
  - [ ] 与 `Project` 模块集成：在项目创建/设置中维护仓库绑定关系。
  - [ ] 输出结构化 diff 与提交摘要，为 `AIHub` 代码审查工作流提供输入。

- **Terminal 模块**
  - [ ] 按 `feature-terminal.md` 与 `api-terminal.md` 定义 `TerminalSession` / `CommandExecution` 模型。
  - [ ] 实现 `POST /_api/terminal/sessions`、`/sessions/:id/commands` 等 REST 接口。
  - [ ] 在 WebSocket 层实现 `terminal.output` 事件，将命令输出流式推送给前端。

### 6.3 前端 TODO（apps/frontend）

- **Git 视图**
  - [ ] 在 `modules/integration` 或单独 `modules/git` 下实现仓库列表 / 提交记录 / diff 视图。
  - [ ] 在 `ProjectDashboard` 中展示当前项目的 Git 活跃度与最近 PR/提交。
  - [ ] 在任务详情中展示关联提交 / 分支信息（如从提交信息中解析任务 ID）。

- **Terminal UI**
  - [ ] 在 `modules/terminal` 中集成 `xterm.js`，实现多会话 Tab 与基础命令输入。
  - [ ] 订阅 `terminal.output`，实时呈现命令输出；在错误块处提供“让 AI 看看”入口。
  - [ ] 与 `Project` 集成：创建 Session 时默认使用当前项目工作目录。

---

## 7. Phase 5：Integration & Notification

### 7.1 目标与范围

- 与外部工具（Jira/Linear/CI/Slack 等）建立**数据与事件通路**。
- 打造**统一通知中心**，并为日报/周报与 Digest 能力打基础。

### 7.2 后端 TODO（apps/server）

- **Integration 模块**
  - [ ] 按 `feature-integration.md` 与 `api-integration.md` 定义 `IntegrationConfig` / `ExternalIssueLink` 等模型。
  - [ ] 实现 `GET /_api/integrations` 与 `POST /_api/integrations/:provider/config`。
  - [ ] 实现 GitHub/GitLab/Jira/Webhook 等最小化接入，转换为内部领域事件（通过 `MessageBus`）。

- **Notification 模块**
  - [ ] 按 `feature-notification.md` 与 `api-notification.md` 建模 `Notification` / `NotificationPreference`。
  - [ ] 实现站内通知接口：`GET /_api/notifications` / `POST /_api/notifications/read` 等。
  - [ ] 实现用户偏好接口：`GET/PUT /_api/notifications/preferences`。
  - [ ] 从 `MessageBus` 订阅关键领域事件（任务状态变更 / CI 结果 / AI 工作流完成等），生成通知记录并调度投递。

### 7.3 前端 TODO（apps/frontend）

- **通知中心 UI**
  - [ ] 在顶栏实现消息中心入口与红点提示；列表支持未读 / 已读过滤。
  - [ ] 实现通知详情与一键标记已读。

- **集成配置 UI**
  - [ ] 在 `modules/integration` 或 `modules/settings` 下实现集成列表与配置表单。
  - [ ] 在项目设置页中支持项目级集成配置覆盖。

---

## 8. Phase 6：Plugin 生态与扩展点

### 8.1 目标与范围

- 提供**可用的插件运行时与 Plugin API**，支持内部插件与社区插件扩展系统行为与 UI。

### 8.2 后端 TODO（apps/server）

- **Plugin 核心**
  - [ ] 按 `feature-plugin.md` 与 `api-plugin.md` 定义 `InstalledPlugin` / `PluginManifest` 等模型。
  - [ ] 实现插件安装 / 启用 / 禁用 / 卸载接口（`/_api/plugins/*`）。
  - [ ] 实现插件运行时与沙箱（独立进程或 Worker + 权限校验），对外暴露受控 Plugin API。
  - [ ] 基于 `MessageBus` 将领域事件转发给插件，实现插件事件订阅。

### 8.3 前端 TODO（apps/frontend）

- **插件管理 UI**
  - [ ] 在 `modules/plugin` 中实现插件列表页、安装 / 启用 / 禁用操作。
  - [ ] 渲染插件元数据（描述、版本、权限请求等）。

- **前端扩展点**
  - [ ] 实现基础的视图扩展点（如 Dashboard 右侧 Panel、侧边栏菜单扩展等）。
  - [ ] 引入前端插件 SDK（或占位），支持在运行时挂载插件提供的 React 组件。

---

## 9. Phase 7：OAuth2 企业增强与高阶能力完善

### 9.1 目标与范围

- 完成**企业级认证 / 授权**与多 IdP 支持，完善团队协作、安全与部署体验。

### 9.2 后端 TODO（apps/server）

- **Auth-OAuth2 完整实现**
  - [ ] 完成 Provider 配置模型、管理接口与健康检查。
  - [ ] 实现完整 OAuth2/OIDC 授权码 + PKCE 流程（`/authorize` / `/callback` / `/logout`）。
  - [ ] 实现用户映射与角色 / 组映射逻辑（与现有 RBAC 打通）。
  - [ ] 实现 Token 加密存储与刷新逻辑，必要时支持单点登出。

- **团队协作与审计补强**
  - [ ] 基于现有审计日志能力，补充敏感操作记录（权限变更、插件安装、集成配置修改等）。
  - [ ] 完善项目级权限矩阵与角色管理接口。

### 9.3 前端 TODO（apps/frontend）

- **SSO 登录流**
  - [ ] 在登录页接入 `GET /_api/auth/oauth2/providers`，渲染 Provider 按钮。
  - [ ] 根据回调结果刷新前端登录态，与本地登录共存或切换。

- **团队 / 权限管理 UI**
  - [ ] 在项目设置或全局设置中实现成员列表、角色分配与权限视图。

---

## 10. 建议的执行节奏（Sprint 粒度示例）

- **Sprint 1–2**：完成 Phase 1（Core + User/Auth + Project-Metadata + 前端 Auth/基础布局）。
- **Sprint 3–4**：完成 Phase 2（Project 模块：项目 / 任务 / 迭代 + 前端列表/看板）。
- **Sprint 5–6**：完成 Phase 3（AIHub MVP：AI 对话 + 工作流最小功能）。
- **Sprint 7–8**：完成 Phase 4（Git & Terminal 集成）。
- **Sprint 9–10**：完成 Phase 5（Integration & Notification）。
- **Sprint 11+**：推进 Plugin 生态与企业增强（Phase 6–7），根据反馈迭代核心体验。

> 后续在每个 Sprint 内，可进一步把本文件中的 TODO 拆解到具体 Issue / Task（按后端 / 前端 / DevOps 维度），并与 `docs/feature-design/*` 的详细需求保持同步更新。

