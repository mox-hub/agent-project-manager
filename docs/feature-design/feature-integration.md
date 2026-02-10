# Integration 模块功能技术说明书

## 1. 概述

**Integration 模块**负责与外部系统（仓库托管、CI/CD、项目管理、即时通讯、云存储等）的连接，是系统作为“开发者工具链中枢”的关键入口。  
该模块通过统一的连接器模型与事件流，为 Project、AIHub 与 Plugin 提供一站式外部集成能力。

## 2. 目标与范围

- **目标**
  - 为常见开发工具与 SaaS 服务提供开箱即用的连接器。
  - 通过标准化数据模型简化上层使用（如统一的 Issue、Build、Alert 抽象）。
  - 为插件与 AI 提供对外部系统的安全访问通道。

- **范围**
  - Git 平台集成（GitHub/GitLab 等）。
  - 项目管理工具（Jira/Linear 等）。
  - CI/CD 平台集成（GitHub Actions、GitLab CI 等）。
  - 即时通讯（Slack/Discord 等）。
  - 云存储与文档服务（S3、GCS 等）。

## 3. 功能需求拆解

### 3.1 连接器管理

- **FR-INT-01 连接器配置**
  - 支持在设置中心配置各类外部服务的凭据（API Token、Webhook URL 等）。
  - 支持按项目覆盖连接器配置（如不同项目对应不同 Jira 项目）。

- **FR-INT-02 连接状态监控**
  - 显示每个连接器的当前状态（正常/异常/未配置）。
  - 在连接异常时提供重试与错误详情。

### 3.2 数据与事件集成

- **FR-INT-10 Issue/Ticket 同步**
  - 从 Jira/Linear 等同步需求与缺陷信息，映射为本地 Task 或链接到 Task。

- **FR-INT-11 CI/CD 状态集成**
  - 建立与 CI 平台的 Webhook 或轮询集成，接收构建/部署结果。
  - 将 CI 结果与 Git 提交、Task 关联，支持在项目仪表盘中查看。

- **FR-INT-12 通知集成**
  - 将重要事件（构建失败、评审完成、里程碑达成等）推送到 Slack/Discord 等。

## 4. 接口设计

- `GET /_api/integrations`
  - 功能：列出当前配置的所有集成。

- `POST /_api/integrations/:provider/config`
  - 功能：设置指定 provider 的连接配置。

- Webhook 接口（例如 `/webhook/github`, `/webhook/gitlab`, `/webhook/jira`）
  - 功能：接收外部系统事件并转换为内部事件（如构建完成、Issue 更新等）。

## 5. 与其他模块的交互

- **ProjectModule**
  - 将外部 Issue/Task 映射到本地任务或建立链接。

- **GitModule**
  - 将 CI/CD 状态与提交/分支/PR 对齐。

- **AIHubModule**
  - 为 AI 分析提供更丰富的上下文（如历史 CI 失败记录、外部缺陷数据）。

- **PluginModule**
  - 为插件暴露标准化的外部集成接口，插件可在其基础上构建更高层功能。

## 6. 数据模型

- `IntegrationConfig`
  - `id, provider, scope: 'global' | 'project', projectId?, configJson, createdAt, updatedAt`.

- `ExternalIssueLink`
  - `id, projectId, taskId?, provider, externalId, url, metadata`.

## 7. 权限与安全

- 对连接器配置与访问外部系统的操作仅限 Owner 或管理员。
- 外部凭据需加密存储，并尽量采用短期 Token + 刷新机制。

