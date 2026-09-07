---
title: AGENTS.md - 跨工具 AI 会话入口
description: 仓库统一 AI 指令入口（AGENTS.md 标准）——会话启动、治理铁律、技术栈、模块地图、文档导航、质量门禁、分支策略
id: ROOT-001
category: meta
status: active
version: 1.0.0
created: "2026-09-07"
modified: "2026-09-07"
scope: AI 会话（Claude Code / Codex / Cursor / opencode 等跨工具入口）
ai-session-types: all
ai-priority: critical
ai-freshness: realtime
ai-audiences: "session:all"
tags: "AI, governance, meta, entry, agents"
---

# AGENTS.md — 跨工具 AI 会话入口

> **本文件 = 仓库统一 AI 指令入口**（跨工具 `AGENTS.md` 标准，Claude Code / Codex / Cursor / opencode 均原生读取），取代原根 `CLAUDE.md`（已合并入库）。v1.0.0（2026-09-07）随核心模型重构落地：数据模型已物理改名（`Task` 族 → `Issue` 族、`ExecutionRun` → `Execution`）。
>
> 三真相源：**代码实现** = 运行时真相；**docs/02-架构设计/** = 开发时真相；**PRD** = 需求真相。冲突时停止开发、人工裁决。
>
> **本文档自身受 `scripts/check-doc-sync.mjs` 管理**：必须保留 YAML frontmatter（`title`/`description`/`status`）；`docs/*` 变更需与本文件或 `CHANGELOG.md` 同 PR 提交。

## 一、会话启动清单

1. 读本文件 — 治理铁律 + 技术栈 + 模块地图
2. 读根 `architecture.md` — 主架构文档（v4，双表面/系统分层/主线对象/契约）
3. 读 `docs/01-需求/产品需求文档-v3.md` — 需求真相源
4. 涉及具体模块时读 `docs/02-架构设计/architecture/{backend,frontend}/modules.md`
5. 确认工作目录与分支状态

## 二、项目简介

Agent Project Manager (APM) 是一个 **AI 驱动的项目管理工具**，采用**双表面架构**：

- **人类控制面**：React Web（项目/工单/验收/审批/文档/AI 面板）+ Tauri 桌面壳
- **AI 执行面**：`apm-runtime` 守护进程 → CLI Adapters（`claude-code` / `codex` / `zcode`）执行代码、Git、终端命令

| 用户角色 | 核心需求 |
|----------|----------|
| 项目经理 | 任务分配、执行监控、审批决策 |
| 开发工程师 | 接收任务、执行代码、提交结果 |
| AI Agent | 读取上下文、执行任务、汇报结果 |

**差异化**：AI 原生双表面 · 双轨成本（Token + 工时）· 信任演进（执行评估驱动的 Agent 信任等级）；V4 加入 **Acceptance 验收门禁收口执行闭环** 与 **工作区多库路由**。

## 三、治理铁律 [MUST]

| 规则 | 内容 | 违反后果 |
|------|------|---------|
| **中文优先** | 所有对话、文档、思考输出均用**中文** | MUST |
| **单一真相源** | 代码 = 运行时真相；设计文档 = 开发真相；PRD = 需求真相 | 冲突时停止开发，人工裁决 |
| **文档即契约** | `[MUST]` 变更需显式更新文档；`[SHOULD]` 偏离记录到 `docs/02-架构设计/策略/决策日志.md`；`[MAY]` AI 自决 | 文档不同步 = CI 阻断 |
| **变更摘要** | 每次回复附变更摘要：修改范围 / 变更类型（feature/refactor/fix/config/docs）/ 影响分析 / 同步状态 | MUST |
| **不静默覆盖** | 文档/契约冲突一律升级人审，绝不静默覆盖 | MUST |

## 四、仓库结构（pnpm 11 + turbo 2 + pnpm catalog）

```
agent-project-manager/
├── apps/
│   ├── server/        # NestJS 10 + Prisma 6 (SQLite) —— 控制面 REST/WS + 执行核心 + 数据层
│   ├── frontend/      # React 19 + Vite 7 + Tailwind 4 —— 人类控制面 (web)
│   ├── cli/           # @apm/cli：瘦客户端(apm) + 常驻守护进程(apm-runtime)
│   └── desktop/       # Tauri 2 桌面壳（托管前端 + 本地能力）
├── packages/
│   └── apm-shared/    # @apm/shared：CLI/runtime 协议镜像、CLI adapters、HTTP 客户端、生成类型
├── openapi.json       # API 契约真相（供 contract:check / 双端类型生成）
└── scripts/           # 质量与巡检脚本（check-doc-sync / contract-check / cli-contract / api-audit …）
```

> 依赖治理：`pnpm-workspace.yaml` 集中版本（catalog）+ `turbo.json` 任务编排 + husky/lint-staged 提交护栏 + knip/dependency-cruiser/renovate 巡检。Node/包管理基线：pnpm **11**（非 8）。

### 技术栈要点

| 层 | 技术 | 状态 |
|----|------|------|
| 后端 | NestJS 10 · Prisma 6 · SQLite（每工作区一库）| 主线 |
| 前端 | React 19 · Vite 7 · Tailwind 4 · **`@base-ui/react`** | radix / kibo-ui 已退场 |
| 前端状态 | **Zustand 5**（唯一全局状态库）| 无 jotai |
| 异步 | TanStack Query v5 + TanStack Table | 主线 |
| 表单/校验 | React Hook Form + Zod | 主线 |
| 编辑器/渲染 | CodeMirror 6 · MDX · react-markdown | 主线 |
| AI | `ai` + `@ai-sdk/react`（前端）· AI SDK 适配（后端 ai-hub）| 主线 |
| 实时 | socket.io（Server Gateway / 前端 event-client）| 主线 |
| 桌面 | Tauri 2（`apps/desktop/src-tauri/`）| Electron 仅历史维护 |
| 测试 | Jest+SWC（server）· Vitest+Testing Library（frontend）· Playwright（E2E）| 主线 |

## 五、常用命令

```bash
# 根目录
pnpm dev            # 并行启动 server + frontend
pnpm build          # 全仓构建（turbo）
pnpm lint           # Lint 所有包
pnpm quality:gate   # 全链路质量门禁（见 §七）
pnpm check:docs-sync

# Server (apps/server)
pnpm dev:server     # nest start --watch
pnpm test           # Jest 单元测试
pnpm prisma:migrate:dev
pnpm build:template-db   # 重建工作区模板库

# Frontend (apps/frontend)
pnpm test           # Vitest
pnpm test:ui        # Vitest UI
```

## 六、模块地图（v4，术语一律用新口径）

> 前后端模块结构、真实目录与模块注册顺序见
> `docs/02-架构设计/architecture/backend/modules.md`（36 目录 / 38 Module 类）
> 与 `frontend/modules.md`（36 模块目录）。下为高层地图。

**域分组（后端 = 前端对齐口径）**

| 域 | 后端模块 | 前端模块 |
|----|---------|---------|
| 身份与访问 | `auth`（+`access-token`）| `auth` |
| 用户/团队/角色 | `user`·`team`·`role` | `team-member`·`project-role` |
| 项目与工作区 | `project`·`workspace`·`metadata`·`config` | `project`·`workspace`·`config`·`core-config` |
| 工单域（Task/Bug 统一）| `issue`·`issue-type`·`issue-template`·`iteration` | `issue`·`task-template` |
| 文档与知识 | `document`（+`document-enhance`）·`activity`·`subscription` | `document`·`activity` |
| AI 执行编排 | `ai-hub`·`execution`·`runtime`·`cli-dispatch`·`cli-provider`·`skills`·`context` | `ai-hub`·`assistant`·`execution`·`executions`·`runtime`·`skills` |
| 治理与验收 | `acceptance`·`trust`·`decision` | `acceptance`·`decision` |
| 协作与记忆 | `collaboration`·`memory`·`office`·`dashboard` | `office`·`delivery`·`desktop`·`onboarding` |
| 集成与能力 | `integration`·`git`·`mail`·`mcp-server`·`notification`·`plugins`·`admin` | `integration`·`github`·`linear`·`mcp-server`·`notification`·`git`·`admin` |
| 系统/辅助 | — | `analytics`·`boot`·`search`·`settings`·`help`·`design-system` |

> 后端共 **36 目录 / 38 业务 Module 类**（`auth` 拆 `access-token`、`document` 拆 `document-enhance`）；前端共 **36 模块目录**。

**主线对象（数据模型）**

| 对象 | 模块 | 说明 |
|------|------|------|
| `Issue`（原 Task 族）| issue | 工单统一模型（Task/Bug），API `/issues` + `issueId` |
| `Acceptance` / 标准 / 证据 | acceptance | ★ 验收门禁（V3/V4 核心）|
| `Execution`（原 ExecutionRun）/ `ApprovalRequest` | execution | 执行状态机 / 审批 |
| `Runtime` / `RuntimeSession` | runtime | 本地执行节点（terminal 已废弃并入）|
| `Member`（human / platform_ai_member / external_agent）| team | 统一主体身份 |
| `Document` 族 · `MemoryAtom` · `DecisionProposal` | document / memory / decision | 知识 / 记忆 / 决策 |

## 七、契约与质量门禁

**跨层契约**

| 契约 | 位置 | 校验 |
|------|------|------|
| API 契约（三件套）| 仓库根 `openapi.json` | server `contract:export` → 前端 + `@apm/shared` 双份 `api-types.gen.ts` → `contract:check` 零漂移 |
| CLI 运行时协议 | `packages/apm-shared/src/runtime/protocol.ts` + server `modules/runtime/` | `check:cli-contract` |
| 变更契约 | `CHANGELOG.md` | — |
| 文档契约 | 本文件 + README + docs/ | `check:docs-sync`（**本文件为 CI 治理对象**）|

**质量门禁（根 `quality:gate` 顺序）**：`type-check` → `lint` → `test`（server swc/jest + frontend vitest）→ `contract:check` → server `test:e2e` → `api:audit --min=95` → `check:docs-sync`。CI = `quality-gate.yml`（七并行 job + pnpm 缓存）。**文档不同步 / 验收证据缺失 / api 覆盖率不达标不得合并。**

**后端关键机制**：全局前缀 `/_api`；`x-workspace-id` 头 → `workspaceALS`（AsyncLocalStorage）→ 数据层按工作区路由到对应 SQLite 库（`default` = `DATABASE_URL`，新库以 `prisma/template.db` 复制初始化）；JWT + PAT + RuntimeSession 认证；Helmet/Throttler/CSRF/CORS 白名单。

## 八、分支策略与发布

```
main  ← pre-prod ← develop ← feat/* · chore/* · fix/*
hotfix/*（从 main 检出） · release/*（从 pre-prod 检出）
```

- 命名：`feat/<module>-<short-desc>` · `fix/<module>-<short-desc>` · `hotfix/<version>-<desc>` · `release/<version>` · `chore/<short-desc>`
- 流程：`develop → pre-prod → main`；标签：dev 无 / alpha `-alpha` / beta `-beta` / rc `-rc.N` / release 无后缀
- **术语口径基线分支**：`fix/core-model-refactor`（Prisma `Task` 族 → `Issue` 族落地，未合入前以该分支为模型真相）

## 九、AI 协作约定

- 改模块前先读 `docs/02-架构设计/architecture/{backend,frontend}/modules.md` 对应域，遵守模块放置规范（前端：模块专用组件入 `modules/{module}/components`，跨模块业务组件入 `shared/components`，UI 原子入 `components/ui`）。
- 契约驱动：涉及 API 字段 → 先动根 `openapi.json` / 后端 DTO，再 `contract:export` 生成前端类型，禁手工改 `api-types.gen.ts`。
- CLI 协议变更 → 改 `packages/apm-shared/src/runtime/protocol.ts` 并镜像 server `modules/runtime/dto`，跑 `check:cli-contract`。
- 行为/状态变更 → 同步 `docs/` 设计文档 + `CHANGELOG.md`（文档即契约）。
- 定义完成：改完自查 `pnpm quality:gate`（或最小子集 type-check + test + lint），并在回复附变更摘要。
