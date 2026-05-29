---
title: 架构总览
description: 主架构文档，包含双表面架构、技术栈、领域模型、实施路线图
id: ROOT-002
category: architecture
status: active
version: 3.0.0
created: 2026-05-29
modified: 2026-05-29
scope: 系统架构设计
ai-session-types: all
ai-priority: high
ai-freshness: weekly
ai-audiences: session:all
tags: architecture, backend, frontend
---

# 架构总览

## 1. 架构原则

- **模式**：Client-Server + REST + WebSocket
- **API前缀**：`/_api`，Swagger文档 `/_api/docs`
- **治理原则**：文档先行、契约驱动、测试可追溯
- **UI原则**：主线 `shadcn/base-ui`，Radix为过渡，kibo-ui仅短期桥接

## 2. 系统分层

### 2.1 后端（NestJS + Prisma）

```
apps/server/src/
├── core/           # config, database, logger, message-bus, guards
├── common/        # 全局filters, pipes, decorators
├── modules/        # 功能模块
│   ├── auth/       # JWT认证 + OAuth2
│   ├── user/       # 用户管理
│   ├── project/    # 项目CRUD
│   ├── task/       # 任务看板
│   ├── iteration/  # 迭代管理
│   ├── ai-hub/     # AI对话 + 执行编排
│   ├── integration/# 第三方集成
│   ├── notification/# 通知系统
│   ├── git/        # Git仓库管理
│   ├── terminal/   # 终端会话
│   ├── plugins/    # 插件系统
│   ├── metadata/   # 标签/状态/模板
│   ├── config/     # 配置管理
│   └── task-template/# 任务模板
└── gateways/      # WebSocket网关
```

### 2.2 前端（React + Vite）

```
apps/frontend/src/
├── modules/        # 业务模块（9个）
│   ├── auth/       # 身份验证
│   ├── project/    # 项目管理
│   ├── task/       # 任务看板
│   ├── ai-hub/     # AI对话
│   ├── git/        # Git操作
│   ├── terminal/   # 终端
│   ├── integration/# 集成管理
│   ├── notification/# 通知
│   └── settings/   # 设置
├── components/
│   ├── ui/         # shadcn/base-ui 基础组件
│   └── kibo-ui/    # 高级视图桥接层
├── hooks/          # 自定义hooks
└── infrastructure/# api-client, store
```

### 2.3 双表面架构

```
┌─────────────────────────────────────────────────────────────┐
│                    人类控制面 (Web Control Plane)            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │项目管理 │ │任务看板 │ │审批决策 │ │配置管理 │         │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
└─────────────────────────────────────────────────────────────┘
                              ↕ REST/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                    AI执行面 (Local Runtime)                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │文件操作 │ │Git操作  │ │终端执行 │ │CLI调用  │         │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## 3. 关键跨层契约

| 契约类型 | 位置 | 说明 |
|----------|------|------|
| 需求契约 | `docs/meta/PRD.md` + `docs/meta/requirements/*` | FR定义、边界、验收 |
| 设计契约 | `docs/meta/contracts/*` + `docs/api/*` | API、数据模型、状态流 |
| 执行契约 | `docs/reports/TODO.md` | owner/due/status/evidence |
| 变更契约 | `CHANGELOG.md` | 版本-模块-证据追溯 |

## 4. 数据模型

### 核心实体

```
User ──┬── ProjectMember ── Project
       │                      │
       │                      ├── Iteration
       │                      │
       │                      └── Task ─── TaskDependency
       │                              │
       │                              ├── ExecutionRun ─── ExecutionStep
       │                              │                    └── ExecutionArtifact
       │                              │
       │                              └── ApprovalRequest
       │
       └── AgentTrustProfile
```

### AI相关实体

```
ExternalAgent ── ExecutionRun ── ExecutionStep
      │                  │              │
      │                  │              └── ExecutionEvaluation
      │                  │
      │                  └── ContextPack
      │                           │
      └── AgentTrustProfile       ├── Layer1 (基础)
                                 ├── Layer2 (任务)
                                 ├── Layer3 (知识)
                                 └── Layer4 (扩展)
```

## 5. API架构

### REST API (`/_api/*`)

| 模块 | 路径 | 说明 |
|------|------|------|
| Auth | /_api/auth/* | 认证相关 |
| Users | /_api/users/* | 用户管理 |
| Projects | /_api/projects/* | 项目CRUD |
| Tasks | /_api/tasks/* | 任务管理 |
| Iterations | /_api/iterations/* | 迭代管理 |
| AI Hub | /_api/ai-hub/* | AI执行编排 |
| Git | /_api/git/* | Git操作 |
| Terminal | /_api/terminal/* | 终端命令 |
| Notifications | /_api/notifications/* | 通知 |

### WebSocket Gateway

- 实时事件推送
- 执行状态变更
- 审批通知
- 终端输出流

## 6. 安全架构

- **认证**：JWT (passport-jwt) + OAuth2 (passport)
- **防护**：Helmet (请求头), Throttler (限流), CORS白名单
- **敏感配置**：环境变量强制
- **审计**：统一审计日志

## 7. 质量门禁

- `type-check`：TypeScript类型检查
- `lint`：代码规范检查
- `test`：后端Jest + 前端Vitest
- `docs-sync`：文档同步检查

**阻断策略**：文档不同步、验收证据缺失不得合并

## 8. 详细文档路径

| 分类 | 文档 |
|------|------|
| 后端模块 | `docs/architecture/backend/modules.md` |
| 前端模块 | `docs/architecture/frontend/modules.md` |
| 控制面设计 | `docs/architecture/control-plane-local-runtime-v1.md` |
| Runtime协议 | `docs/architecture/local-runtime-communication-protocol-v1.md` |
| API契约 | `docs/api/overview.md` |
| 开发指南 | `docs/guides/development.md` |
