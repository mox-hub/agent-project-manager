# Git 模块知识库

**生成时间**: 2026-04-27
**父目录**: `../../AGENTS.md`

---

## 概述

Git 模块负责仓库管理、分支/提交/diff 查询、Git 命令执行和工作目录配置。前端遵循模块化架构，每个功能自包含，组件通过 TanStack Query hooks 获取数据。

> 文档即契约。所有 AI 会话必须遵循本文档规范。

---

## 目录结构

```
modules/git/
├── api/
│   └── git-api.ts              # API 客户端（仅 GET/writing 函数）
├── components/
│   ├── bind-repository-dialog.tsx # 绑定仓库对话框组件
│   ├── branch-list.tsx         # 分支列表管理组件
│   ├── commit-list.tsx         # 提交历史列表组件
│   ├── diff-viewer.tsx         # Diff 查看器组件
│   ├── git-command-panel.tsx   # Git 命令执行面板
│   ├── git-tool-status.tsx     # Git 工具状态显示
│   ├── pull-request-card.tsx   # PR 卡片组件
│   ├── pull-request-list.tsx   # PR 列表组件
│   ├── repository-card.tsx     # 仓库卡片组件
│   ├── repository-list.tsx     # 仓库列表组件（按项目筛选）
│   └── workspace-config.tsx     # 工作目录配置组件
├── hooks/
│   ├── use-branches.ts         # 分支 CRUD hooks
│   ├── use-commits.ts          # 提交查询 hooks
│   ├── use-diff.ts             # Diff 查询 hooks
│   ├── use-git-command.ts      # 命令执行 hooks
│   ├── use-git-tool.ts         # Git 工具 hooks
│   ├── use-pull-requests.ts    # PR 查询 hooks
│   ├── use-repositories.ts     # 仓库 CRUD hooks
│   └── use-workspace.ts        # 工作目录 hooks
├── pages/
│   ├── repository-detail-page.tsx    # 仓库详情页
│   ├── repository-list-page.tsx      # 仓库列表页
│   └── repository-settings-page.tsx  # 仓库设置页
└── index.ts                  # 统一导出
```

---

## API 模式

### API 文件 (`api/git-api.ts`)

- **命名**: `gitApi` 对象，按领域分组
- **导出**: 接口类型 + `gitApi` 对象
- **HTTP 方法**: `apiClient.get/post/put/patch/delete`
- **路径前缀**: `/_api/git`

### 端点覆盖

| 领域 | 端点 |
|------|------|
| Repository | GET/POST/PATCH/DELETE `/_api/git/repos` |
| Repository Status | GET `/_api/git/repos/:repoId/status` |
| Branch | GET/POST/DELETE `/_api/git/repos/:repoId/branches` |
| Branch Checkout | POST `/_api/git/repos/:repoId/branches/:name/checkout` |
| Commit | GET `/_api/git/repos/:repoId/commits` |
| Commit Detail | GET `/_api/git/commits/:commitId` |
| Diff | POST `/_api/git/diff` |
| Working Diff | GET `/_api/git/repos/:repoId/diff/working` |
| Staged Diff | GET `/_api/git/repos/:repoId/diff/staged` |
| Pull Request | GET `/_api/git/repos/:repoId/pull-requests` |
| PR Review | POST `/_api/git/pull-requests/:prId/reviews` |
| Git Tool | GET `/_api/git/tool/check`, POST `/_api/git/tool/path` |
| Workspace | GET/PUT/POST `/_api/git/projects/:projectId/workspace` |
| Clone | POST `/_api/git/projects/:projectId/workspace/clone` |
| Command | POST `/_api/git/repos/:repoId/commands/execute` |
| Command History | GET `/_api/git/repos/:repoId/commands/history` |

---

## Hooks 规范

### 命名规则

| 类型 | 命名 | 示例 |
|------|------|------|
| 查询 | `use{Entity}(id, params?)` | `useRepository()`, `useCommits()` |
| 列表查询 | `use{Entity}s(filters?)` | `useRepositories()` |
| 创建 Mutation | `useCreate{Entity}()` | `useCreateBranch()` |
| 更新 Mutation | `useUpdate{Entity}()` | `useUpdateRepository()` |
| 删除 Mutation | `useDelete{Entity}()` | `useDeleteRepository()` |
| 操作 Mutation | `use{Verb}{Entity}()` | `useCheckoutBranch()`, `useExecuteCommand()` |

### 规范

- **导出**: 命名导出（非 default）
- **数据获取**: 通过 `queryFn` 调用 `gitApi` 方法，`.then((res) => res.data)` 提取 data
- **enabled**: 查询需 `enabled: !!id` 防止空 ID 请求
- **refetchInterval**: 状态类查询（status、working diff）设置轮询间隔
- **onSuccess**: Mutation 在成功后 `invalidateQueries` 相关缓存
- **返回**: 直接返回 TanStack Query 返回值（含 `data`、`isLoading`、`error` 等）

---

## 组件规范

### 数据获取

- **禁止**在组件内直接调用 `gitApi`
- **必须**通过 hooks 获取数据（`useRepository`、`useBranches` 等）
- 组件接收数据作为 props 或直接调用 hooks

### Props

- 使用 TypeScript `interface`
- 必要数据通过 props 传入，派生数据在组件内计算

### 状态管理

- 本地 UI 状态用 `useState`
- 服务端数据状态用 TanStack Query hooks

---

## 页面路由

| 路径 | 页面 | 用途 |
|------|------|------|
| `/app/repositories` | `RepositoryListPage` | 仓库列表 + 筛选 |
| `/app/repositories/:repoId` | `RepositoryDetailPage` | 仓库详情（分支/提交/diff/命令/PR） |
| `/app/repositories/:repoId/settings` | `RepositorySettingsPage` | 仓库设置（名称/路径/Provider） |

---

## 模块数据流

```
API (/_api/git/*)
  │
  ▼
git-api.ts (apiClient wrapper)
  │
  ▼
TanStack Query Hooks (use-*.ts)
  │
  ├──► 页面 (pages/*.tsx)     ← 布局 + 路由逻辑
  └──► 组件 (components/*.tsx) ← UI 展示
```

---

## 快速定位

| 任务 | 位置 |
|------|------|
| 添加新 API | `api/git-api.ts` + 对应 `hooks/use-*.ts` |
| 新建页面 | `pages/{name}-page.tsx` + `router.tsx` |
| 新建组件 | `components/{Name}.tsx` |
| 添加 hooks | `hooks/use-{name}.ts` |

---

## 禁忌模式

- **组件中禁止直接 API 调用** — 通过 hooks 获取数据
- **hooks 中禁止本地状态** — 使用 TanStack Query
- **禁止绕过 AuthGuard** — 所有 API 受 JWT 保护
- **危险命令必须确认** — `allowDangerous` 参数需前端二次确认
