# Project 模块功能技术说明书

## 1. 概述

**Project 模块**负责项目维度的核心管理能力，是整个系统的入口与组织单元，包括项目、迭代、任务、依赖关系与进度度量等。  
该模块为上层的 AI 工作流、Git 集成、报表/周报引擎等提供统一的项目上下文与数据基础。

## 2. 目标与范围

- **目标**
  - 提供统一的项目对象模型，支撑从个人项目到团队/企业级项目管理。
  - 支持任务全生命周期管理与可视化进度追踪。
  - 为 AI 模块、Git 模块、Terminal 模块等提供标准化的项目上下文接口。

- **范围**
  - 项目、迭代、任务、子任务、依赖关系、标签与优先级。
  - 项目级配置（仓库绑定、AI 配置、插件配置等）。
  - 项目级统计与进度计算（燃尽、完成率、预测完成时间等）。

## 3. 角色与使用场景

- **角色**
  - 开发者：创建/查看/更新自己参与的项目与任务。
  - Tech Lead / 负责人：规划迭代、拆解需求、调整优先级与依赖。
  - 管理者：查看项目整体进度、瓶颈与风险。
  - AI Agent / 插件：基于项目上下文执行自动化操作。

- **典型场景**
  - 从文档/需求中自动生成项目与任务树，人工审核后落库。
  - 从 Git 活动与测试结果回填到任务与项目进度。
  - AI 根据项目状态与历史数据给出风险预警与排期建议。

## 4. 功能需求拆解

### 4.1 项目管理

- **FR-PJ-01 创建项目**
  - 支持手动创建项目：名称、描述、类型（个人/团队/实验等）、可见范围。
  - 支持基于模板创建项目：从预设模板加载默认任务结构与配置。
  - 支持从 Git 仓库导入：指定仓库路径或远程地址，快速创建项目并绑定仓库。

- **FR-PJ-02 编辑/归档项目**
  - 支持编辑项目基本信息与配置（AI 模型偏好、插件启用、默认分支等）。
  - 支持归档/恢复项目，归档后仅可读，不参与默认视图统计。

- **FR-PJ-03 项目列表与过滤**
  - 支持按参与角色、标签、状态（进行中/归档）、最近活跃时间排序与过滤。
  - 支持快捷搜索（名称、描述、仓库路径、标签）。

### 4.2 任务与迭代管理

- **FR-PJ-10 任务生命周期**
  - 任务状态机：`todo → in_progress → in_review → done`，支持可配置扩展。
  - 支持子任务树结构，子任务状态自动汇总到父任务。
  - 支持任务与代码提交/PR 关联（由 Git 模块提供数据）。

- **FR-PJ-11 迭代（Sprint）管理**
  - 为项目配置一个或多个迭代计划：时间范围、目标与预期工作量。
  - 支持将任务分配到迭代，维护迭代级燃尽图与完成率。

- **FR-PJ-12 任务依赖与阻塞**
  - 支持配置任务间依赖关系（前置/后置）。
  - 自动识别阻塞链路，并暴露给 AI 模块做风险分析。

### 4.3 可视化与统计

- **FR-PJ-20 项目仪表盘**
  - 看板视图：按状态/负责人/标签分列显示任务。
  - 进度视图：完成率、剩余工作量、关键路径摘要。
  - AI 洞察：AI 对当前项目进度、风险、热点的自然语言总结。

- **FR-PJ-21 指标统计**
  - 基本指标：任务数量、完成率、周期时间、重新打开次数等。
  - 趋势图表：随时间变化的提交次数、任务流转、测试通过率（与 Git/CI 模块联动）。

## 5. 非功能需求

- 支持百级项目、万级任务规模下的流畅查询与看板交互。
- 支持本机 SQLite 与内网 PostgreSQL 两种数据库。
- 数据模型稳定，向后兼容，支持插件添加扩展字段。

## 6. 接口设计

### 6.1 REST API（示例）

- `GET /_api/projects`
  - 功能：获取项目列表。
  - 查询参数：`q`（模糊搜索）、`status`、`type`、`memberId`、`sort`.

- `POST /_api/projects`
  - 功能：创建项目。
  - 请求体：`{ name, description, type, visibility, repoBinding?, templateId? }`.

- `GET /_api/projects/:projectId/tasks`
  - 功能：获取项目任务列表。
  - 查询参数：`status[]`、`assigneeId`、`iterationId`、`tag[]` 等。

- `POST /_api/tasks`
  - 功能：创建任务/子任务。
  - 请求体：`{ projectId, parentTaskId?, title, description, status, priority, assigneeId?, dependencies?[] }`.

### 6.2 与其他模块交互

- **与 AIHubModule**
  - 提供项目概览、任务结构、近期变更摘要等上下文。
  - 接收 AI 生成的任务树或排期建议，供用户确认后写入。

- **与 GitModule**
  - 维护项目与仓库绑定关系。
  - 根据分支/提交/PR 信息更新任务进度与活跃度指标。

- **与 TerminalModule**
  - 为终端 Session 提供项目上下文（工作目录、默认分支等）。

- **与 PluginModule**
  - 为插件提供项目查询与写入接口，插件可扩展项目元数据。

## 7. 数据模型

### 7.1 核心实体

- `Project`
  - `id: string`
  - `name: string`
  - `description?: string`
  - `type: 'personal' | 'team' | 'experiment' | 'enterprise'`
  - `visibility: 'private' | 'internal' | 'public'`
  - `status: 'active' | 'archived'`
  - `config: ProjectConfig`
  - `repositories: Repository[]`
  - `members: ProjectMember[]`
  - `createdAt: Date`
  - `updatedAt: Date`

- `Task`
  - 与原文档定义保持一致，增加与 Git/AI 相关的扩展字段（如 `gitRefs`, `aiSuggestion` 等）。

- `Iteration`
  - `id, projectId, name, goal, startDate, endDate, capacity, status` 等。

## 8. 权限与安全

- 访问控制基于 `UserModule/AuthModule` 提供的 RBAC 能力：
  - Owner：完整管理权限。
  - Maintainer：维护项目与任务、配置迭代与依赖。
  - Member：查看项目、创建/编辑自己负责的任务。
  - Guest：只读访问。
- 插件写入项目与任务需声明对应 Permission，系统在 `PluginModule` 中进行二次校验。

## 9. 约束与依赖

- 强依赖：
  - Data 层（SQLite/PostgreSQL + ORM）。
  - User/Auth 模块（用于成员与权限）。
- 弱依赖：
  - Git、Terminal、AI、Plugin 模块（可选增强能力）。

## 10. 验收标准（示例）

- 能在典型个人/团队场景下创建、管理多个项目和数千任务，界面响应在可接受范围内。
- 能将任务与 Git 提交/PR 正确关联，并在项目视图中展示进度。
- AI 能基于项目数据给出合理的进度与风险分析，并支持用户将建议落地为任务与迭代。

