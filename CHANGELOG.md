# Agent Project Manager - 变更日志

> **项目**: Agent Project Manager
> **版本**: 0.3.0 (Project + AI 深度集成版本)

---

## [0.3.0] - 2026-03-06

### 🎯 Project 模块扩展

#### 📖 需求文档更新

**FR-PJ-04**: 项目配置中心（Project Configuration Center）
- ✅ 新增统一的 Tab 式配置入口
- ✅ 支持常规/仓库绑定/云端链接/文档/AI 偏好/插件等配置域
- 📦 修改：`docs/10-requirements/features/feature-project.md`

**FR-PJ-05**: 云端项目双向同步
- ✅ 支持绑定 GitHub Projects v2 / Linear / Jira
- ✅ 同步方向配置（拉取/推送/双向）
- ✅ 字段映射配置与冲突策略
- ✅ 同步状态监控
- 📦 修改：`docs/10-requirements/features/feature-project.md`

**FR-PJ-06**: 外部文档与 API 文档管理
- ✅ 支持添加外部文档链接（Notion/Confluence/Google Docs）
- ✅ 支持添加 API 文档链接（OpenAPI/Apifox/Postman）
- ✅ AI 可索引标记（aiIndexed 字段）
- 📦 修改：`docs/10-requirements/features/feature-project.md`

**FR-PJ-20**: 项目仪表盘（Dashboard）扩展
- ✅ Widget 系统（可拖拽/增删/重排）
- ✅ 12 种图表类型（看板/燃尽图/速度图/CFD/甘特图等）
- ✅ 预设视图（工程师/管理者/AI 洞察/自定义）
- 📦 修改：`docs/10-requirements/features/feature-project.md`

**FR-PJ-22**: 项目健康度评分（Project Health Score）
- ✅ 5 维度加权计算（迭代完成率/逾期率/CI 成功率/提交活跃度/阻塞率）
- ✅ 每日快照机制
- ✅ 健康度趋势分析
- ✅ AI 预警集成
- 📦 修改：`docs/10-requirements/features/feature-project.md`

**FR-PM-40/41/42**: AI Metadata Schema
- ✅ 结构化 AI 可读上下文（techStack/languages/teamSize/lifecyclePhase/complexityLevel）
- ✅ 快照机制（project_ai_context_snapshots）
- ✅ tech_stack 来源规则（手动/Git 推断/模板继承）
- 📦 修改：`docs/10-requirements/features/feature-project-metadata.md`

#### 📐 数据模型更新

**model-project.md** 新增表结构设计：
- ✅ `external_project_links` - 云端项目绑定
- ✅ `project_doc_links` - 外部文档链接
- ✅ `project_api_doc_links` - API 文档链接
- ✅ `project_health_snapshots` - 健康度快照
- ✅ `project_ai_contexts` - AI 上下文
- ✅ `project_ai_context_snapshots` - AI 上下文快照
- 📦 修改：`docs/20-design/models/model-project.md`

### 🤖 AI-Project 深度集成

#### 📖 新增 AI-Project 专篇文档

**feature-ai-project.md**: AI + Project 深度集成
- ✅ L1: 项目级 AI 助手（专属配置/记忆机制/主动预警）
- ✅ L2: 任务级 AI 执行者（分配给 AI/执行规格/结果回写）
- ✅ L3: AI 驱动的自动化规则（事件触发 + AI 判断 + 动作）
- ✅ L4: 主动式 AI 洞察（健康度趋势/迭代预测/团队效能）
- ✅ L5: 自然语言项目管理（意图解析/命令执行）
- 📦 新增：`docs/10-requirements/features/feature-ai-project.md`

**model-ai-project.md**: AI 实体表结构设计
- ✅ `project_ai_configs` - 项目 AI 配置
- ✅ `ai_agents` - AI Agent 实例
- ✅ `task_ai_executions` - 任务级 AI 执行记录
- ✅ `ai_automation_rules` - 自动化规则定义
- ✅ `ai_automation_rule_executions` - 规则执行历史
- ✅ `ai_insight_snapshots` - AI 洞察快照
- 📦 新增：`docs/20-design/models/model-ai-project.md`

### 💻 前端实现

#### 🔧 API 类型更新

**project-api.ts** 新增类型：
- ✅ `ProjectSource`, `ExternalProjectLink`, `ProjectDocLink`, `ProjectApiDocLink`
- ✅ `ProjectHealthSnapshot`, `ProjectAIContext`
- ✅ 新增 API 端点方法（external-links, doc-links, api-doc-links, health-snapshots, ai-context）
- 📦 修改：`apps/frontend/src/modules/project/api/project-api.ts`

#### 🪝 新增 Hooks

- ✅ `use-project-links.ts` - 外部链接、文档链接管理
- ✅ `use-project-health.ts` - 健康度快照、AI 上下文
- 📦 新增：`apps/frontend/src/modules/project/hooks/use-project-links.ts`
- 📦 新增：`apps/frontend/src/modules/project/hooks/use-project-health.ts`

#### 🧩 新增组件

- ✅ `ExternalLinksManager` - 云端项目同步管理（GitHub Projects/Linear/Jira）
- ✅ `DocLinksManager` - 外部文档链接管理
- ✅ `ApiDocLinksManager` - API 文档链接管理
- ✅ `ProjectHealthWidget` - 项目健康度卡片（含趋势图）
- ✅ `AIInsightsWidget` - AI 洞察卡片（技术栈/团队规模/摘要）
- 📦 新增：`apps/frontend/src/modules/project/components/`

#### 📄 页面更新

- ✅ `project-settings-page.tsx` - Tab 式布局（General/Git/Cloud/Docs）
- ✅ `project-dashboard-page.tsx` - 集成健康度和 AI 洞察组件
- 📦 修改：`apps/frontend/src/modules/project/pages/`

### 🖥️ 后端实现

#### 🗄️ 数据库 Schema 更新

**Prisma schema.prisma** 新增表：
- ✅ `ExternalProjectLink` - 云端项目绑定
- ✅ `ProjectDocLink` - 外部文档链接
- ✅ `ProjectApiDocLink` - API 文档链接
- ✅ `ProjectHealthSnapshot` - 健康度快照
- ✅ `ProjectAIContext` - AI 上下文
- 📦 修改：`apps/server/prisma/schema.prisma`

**Project/Task 表新增字段**：
- ✅ `Project.source` - 项目数据来源
- ✅ `Project.healthScore` - 健康度评分
- ✅ `Task.assigneeType` - 任务分配类型
- ✅ `Task.aiAgentId` - AI Agent ID
- ✅ `Task.aiExecutionSpec` - AI 执行规格
- ✅ `Task.aiExecutionResult` - AI 执行结果
- ✅ `Task.aiExecutionStatus` - AI 执行状态

#### ⚙️ Service 层实现

**ProjectService** 新增方法：
- ✅ `getExternalLinks` / `addExternalLink` / `updateExternalLink` / `deleteExternalLink`
- ✅ `getDocLinks` / `addDocLink` / `updateDocLink` / `deleteDocLink`
- ✅ `getApiDocLinks` / `addApiDocLink` / `updateApiDocLink` / `deleteApiDocLink`
- ✅ `getHealthSnapshots` - 获取健康度快照
- ✅ `getAIContext` - 获取 AI 上下文
- ✅ `refreshAIContext` - 刷新 AI 上下文（自动计算健康度与技术栈）
- 📦 修改：`apps/server/src/modules/project/project.service.ts`

#### 🌐 Controller 层实现

**ProjectController** 新增端点：
- ✅ `GET/POST /projects/:id/external-links`
- ✅ `PATCH/DELETE /projects/:id/external-links/:linkId`
- ✅ `GET/POST /projects/:id/doc-links`
- ✅ `PATCH/DELETE /projects/:id/doc-links/:linkId`
- ✅ `GET/POST /projects/:id/api-doc-links`
- ✅ `PATCH/DELETE /projects/:id/api-doc-links/:linkId`
- ✅ `GET /projects/:id/health-snapshots?days=30`
- ✅ `GET /projects/:id/ai-context`
- ✅ `POST /projects/:id/ai-context/refresh`
- 📦 修改：`apps/server/src/modules/project/project.controller.ts`

---

## [0.2.0] - 2026-02-20

### 🎯 P0 任务完成（安全与基础设施）

#### 🔒 安全修复

**P0-SEC-001**: 修复加密密钥硬编码问题
- ✅ 移除 `process.env.INTEGRATION_ENCRYPTION_KEY || 'default-key-change-in-production'`
- ✅ 添加环境变量必填验证，`INTEGRATION_ENCRYPTION_KEY` 未设置时抛出错误
- 📦 `apps/server/src/modules/integration/integration.service.ts`

**P0-SEC-002**: 更新为 `crypto.createCipheriv`
- ✅ 替换已弃用的 `crypto.createCipher` 为安全的 `crypto.createCipheriv`
- ✅ 使用 `crypto.randomBytes(32)` 生成 IV
- ✅ 添加 `crypto.pbkdf2` 进行密钥派生
- 📦 `apps/server/src/modules/integration/integration.service.ts`

**P0-SEC-003**: 限制 CORS origin 白名单
- ✅ 创建 `cors.config.ts` 配置文件
- ✅ 配置允许的 origin 白名单：`['http://localhost:3000', 'http://localhost:5173']`
- ✅ 在 `main.ts` 中应用白名单配置
- ✅ 在 `events.gateway.ts` 中应用白名单配置
- 📦 新增：`apps/server/src/core/config/cors.config.ts`

#### 🔧 TypeScript 类型安全

**P0-TS-001/002**: API 响应类型包装
- ✅ 修复 `use-ai-conversations.ts` API 响应类型
- ✅ 修复 `use-project-list.ts` API 响应类型
- ✅ 更新 `ai-hub-api.ts` 和 `project-api.ts` 返回类型
- ✅ 统一 API 响应格式为 `ApiResponse<T>`
- 📦 修改：`apps/frontend/src/modules/ai-hub/api/ai-hub-api.ts`
- 📦 修改：`apps/frontend/src/modules/project/api/project-api.ts`
- 📦 修改：`apps/frontend/src/modules/ai-hub/hooks/use-ai-conversations.ts`
- 📦 修改：`apps/frontend/src/modules/project/hooks/use-project-list.ts`

**P0-TS-003/004**: 添加缺失的 API 方法
- ✅ 在 `api-client/index.ts` 中添加 `put` 方法
- ✅ 更新 `integration-api.ts` 添加类型定义
- ✅ 更新 `notification-api.ts` 添加类型定义
- 📦 修改：`apps/frontend/src/infrastructure/api-client/index.ts`
- 📦 修改：`apps/frontend/src/modules/integration/api/integration-api.ts`
- 📦 修改：`apps/frontend/src/modules/notification/api/notification-api.ts`
- 📦 修改：`apps/frontend/src/modules/integration/hooks/use-integrations.ts`
- 📦 修改：`apps/frontend/src/modules/notification/hooks/use-notifications.ts`

**P0-TS-005/006/007**: 事件处理器类型安全
- ✅ 创建 `apps/frontend/src/shared/types/socket-events.ts` 定义 SocketEventMap
- ✅ 更新 `use-ai-chat.ts` 使用类型安全的 AI stream 处理
- ✅ 更新 `use-ai-workflows.ts` 使用类型安全的工作流更新处理
- ✅ 移除 `use-event-subscription.ts` 中的重复代码
- 📦 新增：`apps/frontend/src/shared/types/socket-events.ts`
- 📦 修改：`apps/frontend/src/infrastructure/event-client/index.ts`
- 📦 修改：`apps/frontend/src/infrastructure/hooks/use-event-subscription.ts`
- 📦 修改：`apps/frontend/src/modules/ai-hub/hooks/use-ai-chat.ts`
- 📦 修改：`apps/frontend/src/modules/ai-hub/hooks/use-ai-workflows.ts`

**P0-TS-008**: 修复 null vs undefined 类型不一致
- ✅ 修复 `ai-chat-panel.tsx` 中的 null 类型问题
- ✅ 修复 `ai-space-page.tsx` 中的 null 类型问题
- ✅ 移除 `ai-space-page.tsx` 中未使用的 `useState` import
- 📦 修改：`apps/frontend/src/modules/ai-hub/components/ai-chat-panel.tsx`
- 📦 修改：`apps/frontend/src/modules/ai-hub/pages/ai-space-page.tsx`

#### 🔒 安全修复

**P0-SEC-003**: 限制 CORS origin 白名单（更新）
- ✅ 更新 `main.ts` 使用环境变量配置白名单
- ✅ 默认允许 `http://localhost:5173`
- ✅ 使用 `ALLOWED_ORIGINS` 环境变量
- 📦 修改：`apps/server/src/main.ts`

#### 🏗️ 基础设施

**P0-INF-001**: 创建 `src/common/` 目录和共享基础设施
- ✅ 创建 `common/guards/jwt-auth.guard.ts` - JWT 认证守卫
- ✅ 创建 `common/guards/roles.guard.ts` - 角色访问控制守卫
- ✅ 创建 `common/filters/global-exception.filter.ts` - 全局异常过滤器
- ✅ 创建 `common/interceptors/logging.interceptor.ts` - 请求日志拦截器
- ✅ 创建 `common/interceptors/timeout.interceptor.ts` - 请求超时拦截器
- ✅ 创建 `common/interceptors/transform.interceptor.ts` - 响应转换拦截器
- ✅ 创建 `common/pipes/validation.pipe.ts` - DTO 验证管道
- ✅ 创建 `common/decorators/public.decorator.ts` - 公开路由装饰器
- ✅ 创建 `common/decorators/roles.decorator.ts` - 角色需求装饰器
- ✅ 更新 `app.module.ts` 注册全局 providers
- ✅ 创建 `common/index.ts` 统一导出
- 📦 新增：`apps/server/src/common/` 完整目录结构

### 🎯 P1 任务完成（安全增强）

#### 🔒 安全增强

**P1-SEC-001**: 添加速率限制
- ✅ 安装 `@nestjs/throttler` 包
- ✅ 配置三级速率限制：60/min, 500/hour, 2000/day
- ✅ 实现 `RateLimitGuard` 继承自 `ThrottlerGuard`
- ✅ 创建 `RateLimitException` 自定义异常
- ✅ 在 `app.module.ts` 中全局应用速率限制
- ✅ 添加速率限制头到响应
- 📦 新增：`apps/server/src/common/guards/rate-limit.guard.ts`
- 📦 新增：`apps/server/src/common/throttler/throttler.config.ts`

**P1-SEC-002**: 启用全局 ValidationPipe
- ✅ 在 `app.module.ts` 中添加 `APP_PIPE` provider
- ✅ 全局应用 `ValidationPipe`
- ✅ 在 `common/index.ts` 中导出 `ValidationPipe`
- 📦 修改：`apps/server/src/app.module.ts`
- 📦 修改：`apps/server/src/common/index.ts`

**P1-SEC-003**: 添加 Helmet 安全头
- ✅ 安装 `helmet` 包
- ✅ 配置 CSP (Content Security Policy) 策略
- ✅ 配置 HSTS (HTTP Strict Transport Security)
- ✅ 配置 COOP 和 CORP 策略
- ✅ 在 `main.ts` 中全局应用 Helmet
- 📦 新增：`helmet` 依赖
- 📦 修改：`apps/server/src/main.ts`

**P1-SEC-004**: 实现 CSRF 保护
- ✅ 创建 `CsrfConfig` 服务
- ✅ 配置 CSRF 选项（secret, salt, cookie settings）
- ✅ 在 `app.module.ts` 中注册 CsrfConfig
- ✅ 添加 CSRF 基础设施供按需使用
- 📦 新增：`apps/server/src/common/security/csrf.config.ts`
- 📦 修改：`apps/server/src/app.module.ts`

**P1-SEC-005**: OAuth2 策略占位符
- ✅ 验证 `oauth2.controller.ts` 已存在
- ✅ 控制器包含 OAuth2 provider 列表端点
- ✅ 占位符端点已就绪，完整实现将在后续阶段完成
- 📦 现有：`apps/server/src/modules/auth/oauth2.controller.ts`

### 📚 文档更新

#### 新增文档
- ✅ `AGENTS.md` - AI 编码规范（150+ 行）
- ✅ `ANALYSIS_REPORT.md` - 项目分析报告（3519 行）
- ✅ `AI_TODO.md` - AI 可执行任务清单（3519 行）
- ✅ `GIT_WORKFLOW.md` - Git 管理规范（1200+ 行）
- ✅ `P0-COMPLETION-REPORT.md` - P0 完成报告
- ✅ `P0-Security-Fixes-Report.md` - P0 安全修复报告
- ✅ `CHANGELOG.md` - 变更日志（本文档）

#### 文档改进
- ✅ 添加代码风格指南（imports, formatting, types, naming conventions）
- ✅ 添加构建/lint/测试命令说明
- ✅ 添加 Git 工作流和提交规范
- ✅ 更新项目架构和设计文档

### 🔍 配置文件更新

#### 环境变量
- ✅ `.env.example` 文件已完善
- ✅ 添加所有必需的环境变量说明
- ✅ 敏感数据（密钥、密码）使用占位符

#### Git 配置
- ✅ 添加 `.gitignore` 规则（25+ 项）
- ✅ 忽略构建产物、依赖、环境文件、日志文件
- ✅ 忽略 IDE 配置文件（`.vscode/`, `.idea/`）

### 📦 新增文件

**后端新增**:
- `apps/server/src/common/guards/jwt-auth.guard.ts`
- `apps/server/src/common/guards/roles.guard.ts`
- `apps/server/src/common/guards/rate-limit.guard.ts`
- `apps/server/src/common/filters/global-exception.filter.ts`
- `apps/server/src/common/interceptors/logging.interceptor.ts`
- `apps/server/src/common/interceptors/timeout.interceptor.ts`
- `apps/server/src/common/interceptors/transform.interceptor.ts`
- `apps/server/src/common/pipes/validation.pipe.ts`
- `apps/server/src/common/decorators/public.decorator.ts`
- `apps/server/src/common/decorators/roles.decorator.ts`
- `apps/server/src/common/security/csrf.config.ts`
- `apps/server/src/common/throttler/throttler.config.ts`
- `apps/server/src/common/index.ts`
- `apps/server/src/core/config/cors.config.ts`
- `apps/server/src/README.md` - 新增文档

**前端新增**:
- `apps/frontend/src/shared/types/api.ts`
- `apps/frontend/src/shared/ui/filter-panel.tsx` (修改)

**文档新增**:
- `AGENTS.md`
- `ANALYSIS_REPORT.md`
- `AI_TODO.md`
- `GIT_WORKFLOW.md`
- `P0-COMPLETION-REPORT.md`
- `P0-Security-Fixes-Report.md`
- `CHANGELOG.md`

### 📊 依赖包更新

**后端新增依赖**:
- `@nestjs/throttler` (v6.5.0)
- `helmet` (v8.1.0)
- `@types/helmet` (通过安装 helmet)

### 🧪 测试状态

- ✅ 后端 TypeScript 编译通过（仅测试文件有预存问题）
- ✅ 前端 TypeScript 编译通过
- ✅ 所有 P0 和 P1 任务代码修改已验证

### 🔄 后续任务

#### 🎨 前端 UI 组件（Git、Integration、Notification）

**P1-BE-003**: 实现 Git 模块 UI
- ✅ 新增 `repository-card.tsx` - 仓库卡片组件，包含状态徽章、悬停效果
- ✅ 新增 `diff-viewer.tsx` - 差异查看器，显示文件变更统计
- ✅ 新增 `repository-list-page.tsx` - 仓库列表页面，包含空状态
- 📦 新增：`apps/frontend/src/modules/git/components/repository-card.tsx`
- 📦 新增：`apps/frontend/src/modules/git/components/diff-viewer.tsx`
- 📦 新增：`apps/frontend/src/modules/git/pages/repository-list-page.tsx`
- 📦 修改：`apps/frontend/src/modules/git/index.ts`

**P1-BE-004**: 实现 Integration 模块 UI
- ✅ 新增 `integration-card.tsx` - 集成卡片组件，提供者图标和状态指示器
- ✅ 新增 `integration-config-form.tsx` - 集成配置表单，模态对话框
- ✅ 新增 `integration-list-page.tsx` - 集成列表页面，创建集成按钮
- 📦 新增：`apps/frontend/src/modules/integration/components/integration-card.tsx`
- 📦 新增：`apps/frontend/src/modules/integration/components/integration-config-form.tsx`
- 📦 新增：`apps/frontend/src/modules/integration/pages/integration-list-page.tsx`
- 📦 新增：`apps/frontend/src/modules/integration/index.ts`

**P1-BE-005**: 实现 Notification 模块 UI
- ✅ 新增 `notification-center-page.tsx` - 通知中心页面，布局包装器
- 📦 新增：`apps/frontend/src/modules/notification/pages/notification-center-page.tsx`
- 📦 修改：`apps/frontend/src/modules/notification/index.ts`

---

### 🔧 后端核心功能实现

**P1-BE-001**: 实现 Plugin 系统
- ✅ 新增 Plugin, PluginPermission, PluginScope, PluginStatus 枚举
- ✅ 新增 `plugins` 模块目录
- ✅ 创建 PluginService - 插件 CRUD 操作
- ✅ 创建 PluginController - RESTful API 端点
- ✅ 创建 PluginLoaderService - 插件加载和验证
- ✅ 创建 SandboxService - 隔离执行环境
- ✅ 创建 DTOs - plugin.dto.ts
- ✅ 更新 app.module.ts - 注册 PluginModule
- 📦 新增：`apps/server/src/modules/plugins/` 目录
- 📦 新增：`apps/server/prisma/schema.prisma` Plugin models
- 📦 新增：`apps/server/src/modules/plugins/dto/plugin.dto.ts`
- 📦 新增：`apps/server/src/modules/plugins/plugin.service.ts`
- 📦 新增：`apps/server/src/modules/plugins/plugin.controller.ts`
- 📦 新增：`apps/server/src/modules/plugins/plugin.module.ts`
- 📦 新增：`apps/server/src/modules/plugins/runtime/plugin-loader.service.ts`
- 📦 新增：`apps/server/src/modules/plugins/sandbox/sandbox.service.ts`

**P1-BE-002**: 实现 AI 工作流引擎
- ✅ 新增 AIWorkflowDefinition, AIWorkflowStep, AIWorkflowRun 模型到 schema.prisma
- ✅ 创建 WorkflowEngineService - 工作流管理
- ✅ 创建 WorkflowExecutorService - 步骤执行引擎
- ✅ 支持 LLM、code、condition、HTTP、plugin 步骤类型
- ✅ 集成 MessageBus 用于进度通知
- 📦 新增：`apps/server/src/modules/ai-hub/services/workflow-engine.service.ts`
- 📦 新增：`apps/server/src/modules/ai-hub/services/workflow-executor.service.ts`

**P1-BE-003**: 实现 OAuth2 策略
- ✅ 创建 OAuth2Service - 完整 OAuth2 流程
- ✅ 实现 getAuthorizationUrl - 生成授权 URL
- ✅ 实现 handleCallback - 处理回调并交换令牌
- ✅ 实现 refreshAccessToken - 刷新访问令牌
- ✅ 实现 disconnectAccount - 断开账号连接
- ✅ 实现 getUserAccounts - 获取用户 OAuth2 账户
- ✅ 更新 OAuth2Controller 使用 OAuth2Service
- 📦 新增：`apps/server/src/modules/auth/oauth2.service.ts`
- 📦 修改：`apps/server/src/modules/auth/oauth2.controller.ts`

---

### 📝 未完成的 P1 核心功能
- 完整实现 Plugin 模块（数据模型、Service、Controller、Loader、Sandbox）
- 完整实现 AI Hub 工作流引擎（数据模型、WorkflowEngineService、WorkflowExecutorService）
- 完整实现 OAuth2 策略

---

**注意**: 本变更日志记录了所有 P0 和 P1 级别的代码变更。详细的任务列表和执行步骤请参考 `AI_TODO.md` 文档。

