# 前端模块知识库

**生成时间:** 2026-02-21  
**父目录:** `../../AGENTS.md`

---

## 概述

前端采用模块化架构，每个功能自包含。模块位于 `src/modules/`，包含内部 API、hooks、组件和页面。

---

## 模块结构

每个模块遵循此模式：
```
modules/
├── {module-name}/
│   ├── api/           # TanStack Query 客户端（仅 GET）
│   ├── components/    # React 组件
│   ├── hooks/         # 自定义 React hooks
│   ├── pages/          # 路由级页面组件
│   └── index.ts       # 公共导出（如需要）
```

---

## 模块索引

| 模块 | 目的 | API Hooks | 关键组件 |
|---------|-----------|------------|-----------------|
| ai-hub | AI 管理与执行观察 | useAiAgents, useAiModels, useAiProviders | CliDispatchPanel |
| auth | 身份验证 | useAuth | AuthGuard, LoginPage |
| config | 全局/项目设置 | useGlobalConfig, useProjectConfig | （配置表单） |
| core-config | 元数据管理 | useMetadata | （仅 hooks） |
| git | Git 操作 | useRepositories, useCommits | RepositoryList, BranchList, CommitList |
| integration | 外部集成 | useIntegrations | IntegrationList, IntegrationCard |
| notification | 通知 | useNotifications, useNotificationPreferences | NotificationCenter, NotificationButton |
| project | 项目与任务管理 | useProjectList, useProjectDetail, useProjectMutations | ProjectList, ProjectDashboard |
| task | 任务看板与工作流 | useProjectTasks | TaskBoard, TaskDetailDrawer |

---

## 快速定位

| 任务 | 位置 | 说明 |
|------|----------|-------|
| 添加新功能 | 在 `src/modules/{name}/` 下创建模块 |
| 模块 API 模式 | `src/modules/{name}/api/` — TanStack Query 包装器 |
| 模块 hooks | `src/modules/{name}/hooks/` — 自定义 React hooks（use-*） |
| 模块组件 | `src/modules/{name}/components/` — 可复用 UI |
| 模块页面 | `src/modules/{name}/pages/` — 路由组件（页面） |

---

## 代码规范

### 模块 API（`api/`）

- **仅 TanStack Query** — 模块具有只读数据访问
- **命名：** `{实体}Api.ts`（例如 `projectApi.ts`、`gitApi.ts`）
- **导出：** 默认导出、以领域操作命名的异步函数
- **永不变更** — 使用 hooks 中的 `useMutation()` 进行写入

### 模块 Hooks（`hooks/`）

- **命名：** `use-{实体}-{操作}.ts`（例如 `use-project-list.ts`、`use-auth.ts`）
- **规则：** 单一职责，每个功能一个主要 hook
- **导出：** 命名导出 hook 函数

### 模块组件（`components/`）

- **命名：** `PascalCase.tsx`（例如 `TaskBoard.tsx`、`AuthGuard.tsx`）
- **规则：** 纯 UI 组件，不直接进行数据获取
- **Props：** TypeScript 接口，可选链式调用

### 模块页面（`pages/`）

- **命名：** `{实体}-{page}.tsx`（例如 `project-list-page.tsx`）
- **规则：** 路由组件，使用模块 hooks 和组件

---

## 禁忌模式（模块）

- **组件中禁止直接 API 调用** — 通过 hooks 获取数据，使用 hooks
- **hooks 中禁止本地状态** — 使用 TanStack Query 管理服务端状态
- **禁止重复导出** — 仅对显式重新导出使用 `index.ts`
- **禁止跨模块导入** — 通过 `@/modules/{模块名}/api/` 或 `@/modules/{模块名}/hooks/` 导入
- **绝不绕过 AuthGuard** — 受保护路由使用 AuthGuard 包装器

---

## 注意事项

- **共享类型：** `@/shared/types/api.ts`、`@/shared/types/socket-events.ts`
- **全局状态：** Zustand 存储位于 `@/infrastructure/store/app-store.ts`
- **路由：** React Router v7+，位于 `@/app/router.tsx`
- **API 客户端：** 集中式 fetcher 位于 `@/infrastructure/api-client/index.ts`
