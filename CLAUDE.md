---
title: CLAUDE.md - AI开发工具入口
description: AI开发入口，包含项目简介、模块导航、依赖关系、架构决策速查
id: ROOT-001
category: meta
status: active
version: 3.0.0
created: 2026-05-29
modified: 2026-05-29
scope: AI编程会话
ai-session-types: all
ai-priority: critical
ai-freshness: realtime
ai-audiences: session:all
tags: AI, governance, meta, entry
---

# CLAUDE.md - AI开发工具入口

> 本文档是 AI 工具进入项目的入口文件。AI 会话启动时首先阅读本文档。

## 快速上手

1. 读本文档 — 项目简介和AI治理规则
2. 读 `architecture.md` — 主架构文档，理解系统设计
3. 读 `docs/INDEX.md` — 完整文档索引

## 项目简介

Agent Project Manager (APM) 是一个 AI 驱动的项目管理工具，采用双表面架构：
- **人类控制面**：项目管理、任务分配、审批决策
- **AI 执行面**：代码执行、Git 操作、终端命令

## 核心原则

### 1. 单一真相源 [MUST]
- **代码实现**是运行时真相
- **设计文档**（`docs/architecture/`）是开发时真相
- **PRD**（`PRD.md`）是需求真相
- 当三者冲突时，**停止开发，人工裁决后再继续**

### 2. 中文优先 [MUST]
- 所有对话、生成文档、思考方式等，输入输出均采用**中文**

### 3. 文档即契约 [MUST]
- [MUST] = 必须遵守，变更需显式更新文档
- [SHOULD] = 建议遵守，偏离需记录理由到 `docs/meta/decision-log.md`
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
│ ├── server/          # NestJS后端
│ │ ├── src/
│ │ │ ├── core/       # config, database, logger, guards
│ │ │ ├── modules/    # 15+功能模块
│ │ │ └── gateways/   # WebSocket网关
│ │ └── prisma/       # 数据库迁移
│ └── frontend/       # React SPA
│ ├── src/
│ │ ├── modules/      # 9个业务模块
│ │ ├── components/   # ui/ + kibo-ui/
│ │ └── hooks/        # 自定义hooks
├── docs/              # 文档目录
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
| ai-hub | apps/server/src/modules/ai-hub | AI对话 + 工作流 |
| git | apps/server/src/modules/git | Git仓库管理 |
| terminal | apps/server/src/modules/terminal | 终端会话 |
| plugin | apps/server/src/modules/plugins | 插件系统 |

## 文档导航

| 任务 | 文档路径 |
|------|---------|
| AI治理契约 | `docs/meta/AGENTS.md` |
| 架构设计 | `docs/architecture/` |
| API文档 | `docs/api/` |
| 开发指南 | `docs/guides/` |
| 测试报告 | `docs/reports/` |
| 完整索引 | `docs/INDEX.md` |

## 分支策略

| 分支 | 用途 | 保护 |
|------|------|------|
| main | 生产代码 | 受保护，需PR合并 |
| develop | 开发集成 | 可直接推送 |
| feature/xxx | 新功能 | 从develop检出 |
| hotfix/xxx | 紧急修复 | 从main检出 |
| release/x.y.z | 发布准备 | 从develop检出 |

## 会话启动检查清单

1. [ ] 读取根 `CLAUDE.md`
2. [ ] 打开 `docs/INDEX.md` 确认文档入口
3. [ ] 确认任务对应的PRD章节
4. [ ] 检查 `docs/meta/context-sessions.md` 是否有相关历史
5. [ ] 验证工作目录状态

## 变更摘要要求

每次AI回复必须包含变更摘要：
- 修改范围
- 变更类型（feature/refactor/fix/config/docs）
- 影响分析
- 同步状态
