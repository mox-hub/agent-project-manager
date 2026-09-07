---
title: 架构总览
description: 主架构文档（V4）——双表面架构、Monorepo 结构、系统分层、主线对象、跨层契约、安全与质量门禁
id: ROOT-002
category: architecture
status: active
version: 4.0.0
created: 2026-05-29
modified: 2026-09-07
scope: 系统架构设计
ai-session-types: all
ai-priority: high
ai-freshness: weekly
ai-audiences: session:all
tags: architecture, backend, frontend, cli, runtime
---

# 架构总览

> 本文档是系统**主架构文档**（AI 会话第二步阅读）。v4.0.0（2026-09-07）对齐仓库实况：pnpm/turbo/catalog 工具链、四应用 + @apm/shared、后端 36 模块目录（38 Module 类）/ 前端 36 模块目录、工作区多库路由、Runtime 守护进程执行链、openapi 契约三件套。
> **术语口径（2026-09 核心模型重构）**：`Task` 族 → `Issue` 族、`ExecutionRun` → `Execution`；模块目录与 API 面均为新口径（`/issues` + `issueId`）。
> 治理入口见 [[AGENTS.md|AGENTS.md]]；精简直览与完整模块结构见 `docs/02-架构设计/architecture/技术架构总览.md`。

## 1. 架构原则

- **模式**：Client-Server + REST + WebSocket
- **API 前缀**：`/_api`；Swagger `/_api/docs`；契约导出 `/_api/openapi.json`
- **部署**：可单进程托管前端静态产物（`FRONTEND_DIST_DIR`），亦可前后端分离
- **治理**：文档先行、契约驱动、测试可追溯；单真相源（代码 / 设计文档 / PRD 冲突时人工裁决）
- **UI 原则**：主线 `@base-ui/react` + shadcn 生成组件 + Tailwind 4；`components/{ui,brand,icons}` 为组件根；`@radix-ui` / `kibo-ui` / `jotai` 已退场
- **主体模型**：统一三类主体 `human` / `platform_ai_member` / `external_agent`（`Member` 统一身份）
- **工具链**：pnpm 11 workspace + catalog 版本集中 + turbo 2 任务编排 + husky/lint-staged

## 2. Monorepo 物理结构

```
agent-project-manager/
├── apps/
│   ├── server/        # NestJS 10 + Prisma 6 (SQLite)——控制面 REST/WS + 执行核心 + 数据层
│   ├── frontend/      # React 19 + Vite 7 + Tailwind 4——人类控制面 (web)
│   ├── cli/           # @apm/cli：瘦客户端(apm) + 常驻守护进程(apm-runtime)
│   └── desktop/       # Tauri 2 桌面壳（托管前端 + 本地能力）
├── packages/
│   └── apm-shared/    # @apm/shared：CLI/runtime 协议镜像、CLI adapters、HTTP 客户端、生成类型
├── openapi.json       # API 契约真相（contract:check / 双端类型生成）
└── scripts/           # 质量与巡检脚本（check-doc-sync / contract-check / cli-contract / api-audit …）
```

| 组件 | 技术 | 职责 |
|------|------|------|
| `apps/server` | NestJS 10 + Prisma 6 (SQLite) | 控制面 REST + 实时 WS + 执行核心 + 数据层 |
| `apps/frontend` | React 19 + Vite 7 + Tailwind 4 | 人类控制面（web） |
| `apps/cli` | Node + commander + socket.io-client | Agent 侧入口：`apm` 命令 + `apm-runtime` 守护进程 |
| `apps/desktop` | Tauri 2 | 桌面壳（shell），托管前端与本地能力 |
| `packages/apm-shared` | 框架无关 TypeScript | 协议镜像、CLI adapters（codex/claude-code/zcode）、HTTP 客户端 |

## 3. 双表面架构

两个表面共享同一套后端服务与执行核心：

```
┌─────────────────────────────────────────────────────────────┐
│  Human Surface   React Web（项目/工单/验收/审批/文档/AI 面板）  │
│                  + Tauri 桌面壳（apps/desktop）               │
├─────────────────────────────────────────────────────────────┤
│  Agent Surface   @apm/cli（apm 命令）· MCP 接入 · apm-runtime  │
└─────────────────────────────────────────────────────────────┘
            ↓ 共享后端（REST /_api + WebSocket）↓
┌─────────────────────────────────────────────────────────────┐
│  Execution Core  NestJS + 36 业务模块目录 + 事件总线            │
└─────────────────────────────────────────────────────────────┘
            ↓ 派发执行（cli-dispatch，按角色/provider 组装）↓
┌─────────────────────────────────────────────────────────────┐
│  Local Runtime   apm-runtime 守护进程 → CLI Adapters          │
│                  (claude-code / codex / zcode)               │
└─────────────────────────────────────────────────────────────┘
                     ↓ 回传 execution events/result ↓
        Acceptance 验收门禁收口（非"完成即放行"，证据齐才通过）
```

## 4. 系统分层

### 4.1 后端（NestJS + Prisma/SQLite）

```
apps/server/src/
├── core/           # config, crypto, database, logger, message-bus, audit, tracing, exceptions
├── common/         # decorators, dto, filters, guards, interceptors, pipes, security, throttler, utils
├── gateways/       # events.gateway（socket.io 实时事件推送）
├── i18n/           # nestjs-i18n（en / zh-CN）+ generated/
└── modules/        # 36 个业务模块目录（38 个业务 Module 类，全量挂载于 app.module）
```

`modules/` 域分组（**36 目录 / 38 Module 类**——`auth` 拆 `access-token`、`document` 拆 `document-enhance`）：

| 域 | 模块 | 说明 |
|---|---|---|
| 身份与访问 | `auth`(+`access-token`) | JWT + OAuth2 + PAT |
| 用户/团队/角色 | `user`·`team`·`role` | Member 体系、ProjectRoleDefinition（executionRole/promptHint）|
| 项目与工作区 | `project`·`workspace`·`metadata`·`config` | 项目 CRUD+里程碑、多库工作区、标签/状态定义、AppConfig |
| 工单域（Task/Bug 统一）| `issue`·`issue-type`·`issue-template`·`iteration` | Issue 统一模型、IssueType 适配引擎(customFields)、模板、迭代 |
| 文档与知识 | `document`(+`document-enhance`)·`activity`·`subscription` | 富文档(section/version/approval/task-link)、动态追踪、订阅 |
| AI 执行编排 | `ai-hub`·`execution`·`runtime`·`cli-dispatch`·`cli-provider`·`skills`·`context` | ContextPack 策展、Execution 状态机、Runtime 注册、CLI 派发、技能 |
| 治理与验收 | `acceptance`·`trust`·`decision` | ★ 验收契约、信任评分、DecisionProposal |
| 协作与记忆 | `collaboration`·`memory`·`office`·`dashboard` | 接口协作卡、MemoryAtom、办公聚合、仪表盘 |
| 集成与能力 | `integration`·`git`·`mail`·`mcp-server`·`notification`·`plugins`·`admin` | GitHub/Linear/Jira、Git、MailOutbox、MCP、通知、插件、运维 |

> 原 `terminal` 已废弃并入 `runtime`。模块注册顺序与真实目录见 `docs/02-架构设计/architecture/backend/modules.md`。

**数据层与工作区多库**：Prisma 6 + SQLite（每工作区一库）。请求经 `x-workspace-id` 头 → `workspaceALS`（AsyncLocalStorage）→ 数据层路由到对应库；`default` 工作区即 `DATABASE_URL`；新工作区以 `prisma/template.db` 为模板复制初始化。

### 4.2 前端（React + Vite + Tailwind 4）

```
apps/frontend/src/
├── main.tsx                 # 唯一 web 入口 → Provider 栈 → RouterProvider
├── App.tsx                  # 桌面端启动逻辑（Tauri 感知）
├── app/router.tsx           # 路由真相源（createBrowserRouter + lazy）
├── modules/                 # 36 个业务模块目录（Feature-based）+ modules/AGENTS.md 规范
├── shared/                  # 23 个子目录跨模块共享层（components/hooks/layout/theme/mdx…）
├── infrastructure/          # api-client(generated/api-types.gen.ts) · event-client · store(zustand) · hooks
├── components/              # ui/(base-ui/shadcn) · brand/ · icons/
└── i18n/ lib/ hooks/ test/  # 基础设施
```

- 状态：TanStack Query v5（服务端）+ **Zustand 5**（本地全局，无 jotai）；表单 react-hook-form + Zod；表格 TanStack Table。
- 编辑器/渲染：CodeMirror 6 + MDX + react-markdown；图标 lucide-react + @lobehub/icons。
- 测试：Vitest + Testing Library + msw；E2E Playwright（storageState 登录态）。
- 模块清单、放置规范、路由树见 `docs/02-架构设计/architecture/frontend/modules.md`。

### 4.3 控制面与本地执行面（Runtime / CLI 链）

- **Server 侧**：`runtime` 登记在线 Runtime（注册/心跳/capabilities，terminal 并入）；`execution` 承载 Execution 八态状态机与审批（ApprovalRequest）；`cli-dispatch` 按项目角色/CLI provider 解析组装 prompt，经 REST/WS 下派在线 runtime。
- **Runtime 侧（apps/cli）**：`apm-runtime` 守护进程单实例（`runtime.lock` 原子锁 + 陈旧接管），worker 消费派发队列、维护审批映射、进程树取消、事件与结果回传。
- **CLI adapters（@apm/shared）**：`claude-code` / `codex` / `zcode` + `process-runner`，框架无关；协议 DTO 在 `packages/apm-shared/src/runtime/protocol.ts` 与 server `modules/runtime/` **镜像同步**（`check:cli-contract`）。
- **执行闭环**：Execution → 派发 Runtime → CLI adapter → events/result 回传 → **Acceptance 验收门禁**收口。

## 5. 主线对象（数据模型，schema.prisma 109 model）

| 对象 | 模块 | 角色 |
|------|------|------|
| `Issue`（原 Task 族）| issue | 工单统一模型（Task/Bug），依赖/评论/状态机 |
| `IssueType` / `IssueTemplate` | issue-type / issue-template | 类型适配引擎（customFields）/ 模板 |
| `Acceptance` / `AcceptanceCriteria` / `AcceptanceEvidence` | acceptance | ★ 验收原子单位 |
| `Project` / `Iteration` | project / iteration | 聚合顶层 / 迭代 |
| `Execution`（原 ExecutionRun）/ `ApprovalRequest` | execution | 执行尝试 / 审批治理 |
| `Runtime` / `RuntimeSession` | runtime | 本地执行节点 |
| `ContextPack` / `ContextPackSnapshot` | context | 上下文策展与快照 |
| `Member` / `MemberToolGrant` | team | 统一身份（human / platform_ai_member / external_agent）|
| `Repository` / `CliSession` | git / cli-dispatch | 代码 / CLI 会话绑定 |
| `Document` 族 / `MemoryAtom` / `DecisionProposal` | document / memory / decision | 知识 / 记忆 / 决策 |

```
User ──┬── Member ── Project ── Iteration ── Issue(原Task族) ── Execution(原ExecutionRun)
       │                                            │                    │
       ├── 统一主体(human/ai_member/external_agent)  ├── Acceptance       ├── ExecutionStep/Artifact
       └── AgentTrustProfile                        └── ApprovalRequest  └── ContextPack
```

## 6. API 架构

### REST API（`/_api/*`）

| 模块 | 路径 | 说明 |
|------|------|------|
| Auth | `/_api/auth/*` | 认证（JWT/OAuth2）+ PAT（access-token）|
| Users/Teams | `/_api/users/*` · `/_api/members/*` · `/_api/teams/*` | 用户 / Member / 团队 |
| Projects | `/_api/projects/*` | 项目 CRUD + 里程碑 + 成员 |
| Issues | `/_api/issues/*`（含 `/issues/:issueId`）| 工单统一模型（原 tasks）|
| Iterations | `/_api/iterations/*` | 迭代 |
| Executions | `/_api/executions/*` | 执行（原 execution-runs）|
| AI Hub | `/_api/ai/*` · `/assistant/*` | AI 执行编排 / 同事会话 |
| Runtime | `/_api/runtime/*` | 运行时注册/控制/查询 + `/runtime/ws` |
| Git/Repos | `/_api/git/*` · `/_api/repositories/*` | Git / 仓库 |
| Docs | `/_api/documents/*` | 文档管理 |
| Acceptance | `/_api/acceptance/*` | ★ 验收契约 |

> API 真相：仓库根 `openapi.json`（server `contract:export`）；控制器路径以 `openapi.json` 为准。

### WebSocket Gateway

- 实时事件推送（gateways/events.gateway）· 执行状态变更 · 审批通知 · Runtime 会话事件（`/runtime/ws`）。

## 7. 跨层契约

| 契约 | 位置 | 校验 |
|------|------|------|
| 需求契约 | `docs/01-需求/产品需求文档-v3.md` + `需求模块/Feat*.md` | FR 定义、边界、验收 |
| 设计契约 | `docs/02-架构设计/策略/*` | 权限、执行审批、运行时数据模型、CLI 适配器等 |
| **API 契约（三件套）** | 仓库根 `openapi.json` | `contract:export` → 双份 `api-types.gen.ts` → `contract:check` 零漂移 |
| **CLI 运行时协议** | `@apm/shared/src/runtime/protocol.ts` ↔ server `modules/runtime/` | `check:cli-contract` |
| 变更契约 | `CHANGELOG.md` | 版本-模块-证据追溯 |
| 文档契约（演进方向）| `docs/02-架构设计/策略/项目契约与文档知识层-双向绑定设计纪要-v1.md` | 双向绑定、DocRegistry、docs 镜像 |

## 8. 安全架构

- **认证**：JWT（Bearer）+ PAT（AccessToken）+ RuntimeSession（`x-runtime-session-token`）。
- **防护**：Helmet（CSP/HSTS/COEP/COOP）、CORS 白名单、Throttler（RateLimitGuard）、CSRF、ValidationPipe（whitelist/transform）。
- **Webhook**：GitHub webhook raw body HMAC 验签。
- **敏感配置**：环境变量强制 + 脱敏；集成凭据 AES-256-GCM 加密（core/crypto）。
- **审计**：统一审计入口（core/audit），按 executionId 聚合，不可篡改。

## 9. 质量门禁

**根 `quality:gate` 顺序**：`type-check` → `lint` → `test`（server swc/jest + frontend vitest）→ `contract:check` → server `test:e2e` → `api:audit --min=95` → `check:docs-sync`。

- **CI**：`quality-gate.yml`（七并行 job + pnpm 缓存）、`release.yml`。
- **巡检护栏**：knip（未用依赖/导出）、dependency-cruiser（server 依赖边界）、`check:cli-contract`、`check:i18n-sync`、renovate、husky + lint-staged。
- **阻断策略**：文档不同步、验收证据缺失、api 覆盖率不达标不得合并。

## 10. 详细文档路径

| 分类 | 文档 |
|------|------|
| AI 治理入口 | `AGENTS.md`（本仓库跨工具 AI 指令入口）|
| 技术精览 | `docs/02-架构设计/architecture/技术架构总览.md` |
| 后端模块 | `docs/02-架构设计/architecture/backend/modules.md` |
| 前端模块 | `docs/02-架构设计/architecture/frontend/modules.md` |
| 产品架构愿景 | `docs/02-架构设计/architecture/产品架构愿景.md` |
| 控制面/运行时 | `docs/02-架构设计/architecture/控制平面-本地运行时-v1.md` · `本地运行时模块-v1.md` · `本地运行时通信协议-v1.md` |
| CLI/MCP 现状 | `docs/02-架构设计/architecture/CLI-MCP-接入现状.md` |
| 策略与治理 | `docs/02-架构设计/策略/角色级权限模型-v1.md` · `渐进式信任模型.md` · `执行审批模型-v1.md` · `上下文管理设计.md` · `运行时数据模型-v1.md` · `CLI适配器模型-v1.md` · `外部AI集成协议-v1.md` · `决策日志.md` |
| API/协议真相 | 根 `openapi.json` · `packages/apm-shared/src/runtime/protocol.ts` |
| 交互图表 | `docs/diagrams/`（apm-system-architecture / module-dependencies / main-workflow / engineering-workflow）|
| 实施路线 | `docs/roadmap/tasks-phase1-3.md` · `docs/roadmap/stabilization-plan.md` |
