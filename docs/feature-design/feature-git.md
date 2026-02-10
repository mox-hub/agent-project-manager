# Git 模块功能技术说明书

## 1. 概述

**Git 模块**负责与本地与远程 Git 仓库的集成，是实现代码活动与项目/任务/AI 闭环的关键能力。  
它为 Project、AIHub、Terminal 与集成模块提供统一的仓库管理、分支操作、diff 计算与 PR/评审信息。

## 2. 目标与范围

- **目标**
  - 支持多仓库绑定与管理，适配单体仓库与多仓库项目。
  - 在不改变用户现有 Git 使用习惯的前提下，提供可视化与 AI 增强能力。
  - 为 AI 代码审查、进度分析与日报/周报自动生成提供高质量的 Git 上下文。

- **范围**
  - 仓库发现与绑定。
  - 分支管理与状态查询。
  - 提交记录查询与 diff 生成。
  - PR/MR 信息获取与评审集成（通过 GitHub/GitLab 等 API）。

## 3. 典型使用场景

- 将本地已有仓库快速绑定为项目，并自动识别主分支与活跃分支。
- 在项目仪表盘中查看当前迭代/任务对应的提交与 PR 列表。
- AI 基于 diff 对 PR 进行审查，给出问题与建议。
- 基于每日/每周的提交与任务变更自动生成日报/周报草稿。

## 4. 功能需求拆解

### 4.1 仓库管理

- **FR-GIT-01 仓库绑定**
  - 支持在创建项目时指定本地仓库路径或远程仓库地址。
  - 支持一个项目绑定多个仓库，并对仓库进行分组与角色描述（前端/后端/infra 等）。

- **FR-GIT-02 仓库状态查询**
  - 提供当前仓库的干净/脏状态、未跟踪文件、暂存/未暂存变更。
  - 能从 Electron/Terminal 快速跳转到对应项目与仓库视图。

### 4.2 分支与提交管理

- **FR-GIT-10 分支列表与操作**
  - 获取本地与远程分支列表，区分当前分支与跟踪关系。
  - 支持在 UI 中显示分支图谱（简化后的 commit graph）。

- **FR-GIT-11 提交记录查询**
  - 支持按时间范围、作者、文件路径、关键字过滤提交记录。
  - 为 AI 与报表模块提供结构化的提交摘要（变更文件、提交信息、关联任务等）。

### 4.3 Diff 与评审支持

- **FR-GIT-20 Diff 生成**
  - 支持生成：
    - 工作区与 HEAD 的 diff。
    - 两个任意提交/分支之间的 diff。
    - PR/MR 对应的 diff（通过远程服务 API）。

- **FR-GIT-21 评审集成**
  - 为 AIHub 提供 diff 与上下文信息，支持自动生成评审意见。
  - 为 Project 模块提供与任务的关联关系（如在提交信息中引用任务 ID）。

## 5. 接口设计

### 5.1 REST API（示例）

- `GET /_api/git/repos`
  - 功能：获取当前用户可见的仓库列表（按项目维度）。

- `POST /_api/git/repos`
  - 功能：绑定新仓库到项目。
  - 请求体：`{ projectId, localPath?, remoteUrl?, role? }`.

- `GET /_api/git/repos/:repoId/status`
  - 功能：查询仓库状态（干净、未提交变更等）。

- `GET /_api/git/repos/:repoId/commits`
  - 功能：查询提交记录。
  - 查询参数：`from?`, `to?`, `author?`, `path?`, `q?`.

- `POST /_api/git/diff`
  - 功能：生成 diff。
  - 请求体：`{ repoId, baseRef, targetRef, pathFilter?[] }`.

## 6. 与其他模块的交互

- **ProjectModule**
  - 项目与仓库绑定管理。
  - 将提交/PR 与任务/迭代关联。

- **AIHubModule**
  - 提供结构化 diff 与提交历史，作为 AI 分析与评审输入。

- **TerminalModule**
  - 为终端命令提供仓库上下文（当前工作目录、默认分支等）。

- **IntegrationModule**
  - 通过远程服务（GitHub/GitLab）获取 PR/MR、评论与 CI 状态。

## 7. 数据模型

- `Repository`
  - `id, projectId, name, localPath?, remoteUrl?, role?, defaultBranch, provider?`.

- `Commit`
  - `hash, repoId, author, message, date, filesChanged[]`.

- `Diff`
  - `repoId, baseRef, targetRef, files[]`，每个文件包含新增/删除/修改的行级信息。

## 8. 权限与安全

- 仅项目成员可查看与操作对应项目的仓库信息。
- 远程代码托管平台的访问令牌通过 Integration 模块安全管理与加密。

