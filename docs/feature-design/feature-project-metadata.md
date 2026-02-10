# Project-Metadata 模块功能技术说明书（标签/状态/角色/模板）

## 1. 概述

**Project-Metadata 模块**负责项目基础数据的统一建模与管理，包括标签（Tags）、状态（Statuses）、角色（Roles）与模板（Templates）等。  
该模块为 Project、Task、Notification、AIHub 与 Plugin 提供统一的元数据来源，保证多项目、多团队场景下的配置一致性与可扩展性。

## 2. 目标与范围

- **目标**
  - 支持全局与项目级的标签/状态/角色/模板配置。
  - 为任务流转、可视化视图与报表提供一致的元数据定义。
  - 允许管理员与项目 Owner 自定义并管理这些基础配置。

- **范围**
  - 标签（Tags/Labels）：用于任务、项目、文档等资源的分类与筛选。
  - 状态（Statuses）：任务/项目状态机与可用状态选项。
  - 角色（Roles）：除基础 RBAC 角色外的项目内语义角色（如前端/后端/QA/PM 等）。
  - 模板（Templates）：项目/任务/迭代模板与默认配置。

## 3. 使用场景

- 团队在多个项目中复用统一的任务状态定义（如 ToDo/In Progress/In Review/Done）。
- 为不同技术栈项目定义不同的标签集合与默认模板（如前端/后端/数据平台）。
- AI 根据项目模板与标签理解项目类型，从而优化建议与工作流选择。

## 4. 功能需求拆解

### 4.1 标签管理（Tags/Labels）

- **FR-PM-01 全局标签库**
  - 支持管理员维护一组全局标签（如 `frontend`, `backend`, `infra`, `bug`, `feature` 等）。
  - 支持标签属性：名称、颜色、描述、适用资源类型（项目/任务/文档等）。

- **FR-PM-02 项目级标签**
  - 项目 Owner 可在项目内定义额外标签或覆盖全局标签配置（如颜色）。
  - 支持在任务/项目上多选标签，用于过滤与视图分组。

### 4.2 状态与工作流定义（Statuses）

- **FR-PM-10 状态集合**
  - 提供预设状态集合（如基本看板流、带 QA 流程、带部署流程等）。
  - 支持为任务与项目分别定义状态集合（任务状态与项目整体状态）。

- **FR-PM-11 状态机与流转规则**
  - 支持为状态定义允许的前驱/后继状态（例如禁止从 Done 回到 ToDo，需通过 Reopen 流程）。
  - 为 AI 与自动化工作流提供可用状态列表与流转规则。

### 4.3 角色与责任（Roles）

- **FR-PM-20 项目语义角色**
  - 在 RBAC 之上，为项目定义语义角色：
    - 例如：`frontend-dev`, `backend-dev`, `qa`, `pm`, `devops` 等。
  - 用于：
    - 任务分配建议（AI 可以根据任务类型推荐合适角色）。
    - 通知策略（某些事件只通知特定角色）。

- **FR-PM-21 角色映射**
  - 支持将语义角色映射到具体用户或用户组。
  - 支持将语义角色与外部组织结构或 IdP 组进行映射（可结合 OAuth2/SSO）。

### 4.4 模板系统（Templates）

- **FR-PM-30 项目模板**
  - 定义项目模板：包含默认的：
    - 标签集合
    - 状态集合
    - 默认迭代节奏
    - 默认任务结构（如常见的“需求评审→开发→测试→上线”任务树）
  - 新建项目时可选择模板快速初始化项目结构与配置。

- **FR-PM-31 任务与迭代模板**
  - 支持为常见需求/缺陷类型预先定义任务模板（如 Bug 模板、Feature 模板）。
  - 迭代模板：预设迭代长度、目标与任务骨架。

## 5. 接口设计

### 5.1 REST API（示例）

- `GET /_api/metadata/tags`
  - 功能：获取全局和项目级标签集合。
  - 查询参数：`projectId?`.

- `POST /_api/metadata/tags`
  - 功能：创建/更新标签。
  - 请求体：`{ projectId?, name, color?, description?, resourceTypes[] }`.

- `GET /_api/metadata/statuses`
  - 功能：获取任务/项目的状态定义与状态机。
  - 查询参数：`projectId?`, `type: 'task' | 'project'`.

- `GET /_api/metadata/templates/projects`
  - 功能：获取可用项目模板列表。

- `POST /_api/metadata/templates/projects`
  - 功能：创建或更新项目模板。

## 6. 与其他模块的交互

- **ProjectModule / Task**
  - 使用 Project-Metadata 提供的标签与状态进行任务/项目标记与状态流转。

- **AIHubModule**
  - 使用标签/状态/模板信息理解项目类型与流程，优化建议与自动化工作流。

- **NotificationModule**
  - 根据状态变化与角色/标签决定通知策略（如任务进入 `blocked` 状态通知相关角色）。

- **PluginModule**
  - 插件可读取元数据以保持行为与主应用一致，或扩展新的标签/模板（在权限允许范围内）。

## 7. 数据模型

- `Tag`
  - `id, projectId?, name, color?, description?, resourceTypes[], createdAt, updatedAt`.

- `StatusDefinition`
  - `id, projectId?, type: 'task' | 'project', key, name, order, isFinal?, isBlockedState?, transitions[]`.

- `ProjectRoleDefinition`
  - `id, projectId?, key, name, description?, defaultAssignees?[]`.

- `ProjectTemplate`
  - `id, name, description?, defaultTags[], defaultStatuses[], defaultIterations?, defaultTasks?[]`.

## 8. 权限与安全

- 全局元数据管理仅限系统管理员。
- 项目级元数据管理仅限项目 Owner/Maintainer。
- 插件对元数据的写入需声明相应 Permission，并通过 Plugin 模块进行校验。

