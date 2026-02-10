# Notification 模块功能技术说明书（消息提醒与用户自定义）

## 1. 概述

**Notification 模块**负责系统内各种事件的消息提醒与通知分发，为用户提供可配置的消息渠道与内容控制能力。  
它与 MessageBus、Integration、Project、AIHub 等模块协同，将事件转化为对用户有用的提醒（即时或汇总）。

## 2. 目标与范围

- **目标**
  - 为用户提供统一的消息中心，整合项目/任务/Git/CI/AI/插件等多源事件。
  - 支持用户按事件类型自定义通知渠道（站内、邮件、IM 等）与内容粒度。
  - 支持即时通知与定时汇总（日报/周报、Digest）两种模式。

- **范围**
  - 事件归类与通知规则引擎。
  - 通知渠道管理（站内、Email、Slack/Discord 等）。
  - 用户偏好设置（订阅/退订、安静时间、模板与频率）。
  - 通知投递与重试机制。

## 3. 使用场景

- 用户希望只在关键事件发生时收到即时提醒（如构建失败、自己负责的任务被阻塞）。
- 用户希望每天/每周收到一个汇总消息（包括任务完成情况、重要 PR 状态等）。
- 团队在 Slack 频道中接收项目重要事件通知，而个人通过站内消息查看详细内容。

## 4. 功能需求拆解

### 4.1 消息类型与事件映射

- **FR-NOTI-01 事件归类**
  - 将系统中的事件映射为标准通知类型，例如：
    - `task.assigned`, `task.statusChanged`, `task.dueSoon`
    - `git.pr.created`, `git.pr.reviewRequested`, `git.pr.merged`
    - `ci.build.failed`, `ci.build.succeeded`
    - `ai.workflow.completed`, `ai.diagnosis.ready`
  - 提供统一的事件 Schema，便于规则引擎与模板系统使用。

### 4.2 通知渠道管理

- **FR-NOTI-10 渠道定义**
  - 内建渠道：
    - 站内通知（In-app）：顶部/侧边消息中心，红点提醒。
    - Email：通过 SMTP 或第三方服务发送邮件。
    - IM：Slack/Discord 等（依赖 Integration 模块）。
  - 后续可支持插件扩展自定义渠道。

- **FR-NOTI-11 渠道状态与限流**
  - 记录每个渠道的可用状态与错误统计。
  - 对每个用户与渠道设置发送频率与限流策略，防止刷屏。

### 4.3 用户通知偏好与订阅

- **FR-NOTI-20 通知偏好设置**
  - 用户可在设置中心配置：
    - 针对不同事件类型的订阅状态（打开/关闭）。
    - 针对不同渠道的偏好（如：任务相关只在站内，CI 失败发 Email+Slack）。
    - 安静时间段（如晚上或周末暂停即时通知，仅保留站内消息）。

- **FR-NOTI-21 项目级通知设置**
  - 每个项目可以有默认通知策略（例如所有成员接收构建失败提醒）。
  - 项目级设置可被用户个人偏好覆盖。

### 4.4 通知内容与模板

- **FR-NOTI-30 模板系统**
  - 每类事件有默认通知模板（标题与内容），支持占位符（项目名、任务标题、链接等）。
  - 支持为不同渠道配置不同模板（站内短文案、Email 详细内容）。

- **FR-NOTI-31 用户自定义（受限）**
  - 支持高级用户在一定范围内自定义模板变量的组合（开启/关闭某些字段、添加前后缀）。
  - 在未来可与 AI 模块结合，生成更自然的汇总类通知内容。

### 4.5 即时通知与汇总通知

- **FR-NOTI-40 即时通知**
  - 对重要事件实时生成通知记录并投递到用户配置的渠道。
  - 保证站内消息中心总是完整记录所有通知（即使其他渠道失败）。

- **FR-NOTI-41 汇总通知（Digest）**
  - 支持配置每日/每周汇总：
    - 个人 Digest：自己任务与 PR/CI 相关的汇总。
    - 项目 Digest：项目整体进展与风险摘要（通常与日报/周报引擎协作）。
  - Digest 内容可以由 AI 参与生成摘要与解读。

## 5. 接口设计

### 5.1 REST API（示例）

- `GET /_api/notifications`
  - 功能：获取当前用户的站内通知列表。
  - 查询参数：`status?`（未读/已读）、`type?`、`projectId?`, `from?`, `to?`.

- `POST /_api/notifications/read`
  - 功能：将一批通知标记为已读。
  - 请求体：`{ ids: string[] }`.

- `GET /_api/notifications/preferences`
  - 功能：获取当前用户的通知偏好配置。

- `PUT /_api/notifications/preferences`
  - 功能：更新用户通知偏好。
  - 请求体：包括事件类型与渠道偏好、安静时间设置等。

### 5.2 内部接口（服务）

- `NotificationService.publish(event: DomainEvent)`
  - 从 MessageBus 接收领域事件，生成对应通知。

- `NotificationService.send(notificationId, channel)`
  - 将特定通知通过指定渠道发送，内部处理重试与错误。

## 6. 与其他模块的交互

- **Core/MessageBus**
  - 从消息总线订阅领域事件，作为通知触发源。

- **ProjectModule / GitModule / IntegrationModule**
  - 生成与项目、任务、Git 活动与外部服务相关的领域事件。

- **AIHubModule**
  - 可为某些事件（如 AI 工作流完成、诊断结果就绪）生成通知，并参与 Digest 内容生成。

- **User/Auth 模块**
  - 提供当前用户信息与可见项目，限制通知仅发送给有权查看资源的用户。

## 7. 数据模型

- `Notification`
  - `id, userId, type, projectId?, payloadJson, channels[], status: 'unread' | 'read', createdAt, readAt?`.

- `NotificationPreference`
  - `id, userId, projectId?, eventType, channels[], digestFrequency?, quietHours?`.

## 8. 权限与安全

- 仅向有权限访问相关资源的用户发送通知。
- 对外部渠道（Email/Slack）中包含的链接应指向带权限检查的页面。

