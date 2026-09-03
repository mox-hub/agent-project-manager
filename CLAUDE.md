---
title: CLAUDE.md - AI开发工具入口
description: AI开发入口，包含项目简介、模块导航、依赖关系、架构决策速查
id: ROOT-001
category: meta
status: active
version: 4.0.0
created: 2026-05-29
modified: 2026-08-17
scope: AI编程会话
ai-session-types: all
ai-priority: critical
ai-freshness: realtime
ai-audiences: session:all
tags: AI, governance, meta, entry
---

# CLAUDE.md - AI开发工具入口

> **重要更新 (v4.0.0)**：本文档已合并 PRD.md 和 AGENTS.md 的核心内容。详细架构文档见 `architecture.md` 与 `docs/02-架构设计/` 目录。

## 快速上手

1. 读本文档 — 项目简介和AI治理规则
2. 读 `architecture.md` — 主架构文档，理解系统设计
3. 读 `docs/01-需求/产品需求文档-v3.md` — 产品需求

## 项目简介

Agent Project Manager (APM) 是一个 **AI 驱动的项目管理工具**，采用双表面架构：

- **人类控制面**：项目管理、任务分配、审批决策
- **AI 执行面**：外部 AI 开发工具（Codex、Claude Code）执行代码、Git 操作、终端命令

### 目标用户

| 用户角色 | 核心需求 |
|----------|----------|
| 项目经理 | 任务分配、执行监控、审批决策 |
| 开发工程师 | 接收任务、执行代码、提交结果 |
| AI Agent | 读取上下文、执行任务、汇报结果 |

### 差异化优势

- **AI 原生**：不是给 AI 工具增加项目管理，而是为项目管理注入 AI 执行能力
- **双轨成本**：Token 消耗 + 人力工时双重计量
- **信任演进**：基于执行评估的 Agent 信任等级体系

## 核心原则

### 1. 单一真相源 [MUST]

- **代码实现**是运行时真相
- **设计文档**（`docs/02-架构设计/`）是开发时真相
- **PRD**（`docs/01-需求/产品需求文档-v3.md`）是需求真相
- 当三者冲突时，**停止开发，人工裁决后再继续**

### 2. 中文优先 [MUST]

- 所有对话、生成文档、思考方式等，输入输出均采用**中文**

### 3. 文档即契约 [MUST]

- [MUST] = 必须遵守，变更需显式更新文档
- [SHOULD] = 建议遵守，偏离需记录理由到 `docs/02-架构设计/策略/决策日志.md`
- [MAY] = 可选，AI可自主决策

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | NestJS 10.x + Prisma + SQLite |
| 前端 | React 19 + Vite 7.x + TypeScript 5.x |
| 状态管理 | Zustand + Jotai + TanStack Query v5 |
| UI框架 | TailwindCSS 3.x + shadcn + base-ui |
| 测试 | Jest (后端) + Vitest (前端) |
| 包管理 | pnpm 8.x (monorepo) |

## 项目结构

```
agent-project-manager/
├── apps/
│   ├── server/          # NestJS后端
│   │   ├── src/
│   │   │   ├── core/   # config, crypto, database, logger, message-bus, audit, tracing
│   │   │   ├── modules/    # 24 个业务模块
│   │   │   └── gateways/   # WebSocket网关
│   │   └── prisma/     # 数据库迁移
│   └── frontend/       # React SPA
│       ├── src/
│       │   ├── modules/     # 28 个业务模块
│       │   ├── components/  # ui/ + kibo-ui/
│       │   └── hooks/      # 自定义hooks
├── docs/                   # 文档目录（本地，不纳入版本控制）
└── node_modules/
```

## 快速命令

### 根目录
```bash
pnpm dev          # 并行启动 server + frontend
pnpm dev:server   # 仅后端 (nest start --watch)
pnpm dev:frontend # 仅前端 (vite)
pnpm lint         # Lint所有包
```

### Server (apps/server)
```bash
pnpm build        # nest build
pnpm test         # Jest单元测试
pnpm prisma:migrate:dev  # 数据库迁移
```

### Frontend (apps/frontend)
```bash
pnpm build        # tsc -b && vite build
pnpm test         # Vitest
pnpm test:ui      # Vitest UI
```

## 核心模块

| 模块 | 位置 | 说明 |
|------|------|------|
| auth | apps/server/src/modules/auth | JWT认证 + OAuth2 |
| project | apps/server/src/modules/project | 项目CRUD + 里程碑 |
| task | apps/server/src/modules/task | 任务看板 + 依赖 |
| ai-hub | apps/server/src/modules/ai-hub | AI执行编排 |
| execution | apps/server/src/modules/execution | 执行与审批 |
| runtime | apps/server/src/modules/runtime | 本地运行时（terminal 已废弃，功能并入此处）|
| acceptance | apps/server/src/modules/acceptance | 验收管理（V3 核心）|
| document | apps/server/src/modules/document | 文档管理 |
| git | apps/server/src/modules/git | Git仓库管理 |
| cli-dispatch | apps/server/src/modules/cli-dispatch | CLI 派发 |
| mcp-server | apps/server/src/modules/mcp-server | MCP 服务 |
| plugins | apps/server/src/modules/plugins | 插件系统 |
| team | apps/server/src/modules/team | 团队 + Member 管理 |

## 文档导航

| 任务 | 文档路径 |
|------|---------|
| AI治理契约 | `CLAUDE.md`（本文档，已合并 PRD/AGENTS 核心）|
| 产品需求 | `docs/01-需求/产品需求文档-v3.md` |
| 架构设计 | `docs/02-架构设计/architecture/` |
| 后端/前端模块结构 | `docs/02-架构设计/architecture/{backend,frontend}/modules.md` |
| Git工作流 | `docs/meta/git-workflow.md` |
| 版本历史分析 | `docs/meta/history-analysis.md` |
| 实施路线 | `docs/roadmap/tasks-phase1-3.md` |

## 分支策略

### 分支结构

```
main                    # 生产分支 (受保护)
  └── pre-prod          # 预生产/发布候选分支
       └── develop      # 开发主分支
            ├── feat/*  # 功能分支
            ├── chore/* # 维护分支
            └── fix/*   # 修复分支
hotfix/*                # 热修复分支 (从main检出)
release/*               # 发布分支 (从pre-prod检出)
```

### 分支命名规范

| 类型 | 命名格式 | 示例 |
|------|----------|------|
| Feature | `feat/<module>-<short-desc>` | `feat/task-execution` |
| Bugfix | `fix/<module>-<short-desc>` | `fix/auth-token-refresh` |
| Hotfix | `hotfix/<version>-<short-desc>` | `hotfix/v0.4.0-fix-login` |
| Release | `release/<version>` | `release/v0.4.0-beta` |
| Chore | `chore/<short-desc>` | `chore/cleanup-deps` |

### 版本发布流程

```
develop ──→ pre-prod ──→ main
   │           │           │
   │           │           └── v0.4.0 (正式发布)
   │           │
   │           └── v0.4.0-beta (预生产测试)
   │
   └── 持续开发
```

### 版本标签规范

| 阶段 | 标签前缀 | 说明 |
|------|----------|------|
| Development | 无标签 | 持续开发 |
| Alpha | `-alpha` | 内部测试 |
| Beta | `-beta` | 外部测试 |
| RC | `-rc.N` | 候选发布 |
| Release | 无后缀 | 正式版 |

### Cursor Skill 工具

| Skill | 用途 |
|-------|------|
| `git-release-skill` | 发布管理 (pre-prod → main) |
| `branch-manager-skill` | 分支管理 (创建、清理、PR) |
| `version-bump-skill` | 版本管理 (升级、打标签) |
| `stability-check` | 稳定化巡检 (质量门禁检查 + 巡检报告, 见 `docs/roadmap/stabilization-plan.md`) |

## 会话启动检查清单

1. [ ] 读取根 `CLAUDE.md`（本文档）
2. [ ] 读 `architecture.md` 确认系统设计
3. [ ] 确认任务对应的PRD章节 (`docs/01-需求/产品需求文档-v3.md`)
4. [ ] 验证工作目录状态

## 变更摘要要求

每次AI回复必须包含变更摘要：
- 修改范围
- 变更类型（feature/refactor/fix/config/docs）
- 影响分析
- 同步状态

## 相关文档（详细）

- **决策日志** (`docs/02-架构设计/策略/决策日志.md`) - 架构决策记录
- **需求模块文档** (`docs/meta/requirements/`) - 按 Feature 拆分的需求文档

详细架构文档请参考：
- `docs/02-架构设计/architecture/技术架构总览.md` - 技术架构总览
- `docs/02-架构设计/architecture/backend/modules.md` - 后端模块结构
- `docs/02-架构设计/architecture/frontend/modules.md` - 前端模块结构
