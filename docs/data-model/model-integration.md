# Integration 模块数据模型设计（model-integration）

本文件描述外部集成相关的数据模型，包括 **IntegrationConfig / ExternalIssueLink / WebhookEventLog** 等实体。

---

## 1. 实体概览

- `IntegrationConfig`：外部服务连接配置（Git 平台、Jira/Linear、CI/CD、IM 等）。
- `ExternalIssueLink`：本地任务与外部 Issue/Ticket 的关联。
- `WebhookEventLog`：接收到的 Webhook 事件日志（原始与解析结果）。

---

## 2. `integration_configs` 表

**用途**：存储各类外部服务的连接信息与作用范围。

**字段建议：**

- `id` (PK, string/uuid)
- `provider` (string，如 `'github' | 'gitlab' | 'jira' | 'linear' | 'slack' | 'jenkins'`)
- `scope` (string, `'global' | 'project'`)
- `project_id` (FK → projects.id, nullable，当 scope 为 project 时必填)
- `name` (string, not null，配置名称或别名)
- `config` (jsonb/text，完整配置，如 API token、URL、项目/仓库映射等，敏感字段需加密/脱敏)
- `enabled` (boolean, default true)
- `created_at` (timestamp, not null)
- `updated_at` (timestamp, not null)
- `created_by` (FK → users.id, nullable)

**索引建议：**

- `idx_integration_configs_provider`
- `idx_integration_configs_project_id`

---

## 3. `external_issue_links` 表

**用途**：将本地任务与外部 Issue/Ticket 建立关联，以支持需求/缺陷闭环。

**字段建议：**

- `id` (PK, string/uuid)
- `project_id` (FK → projects.id, not null)
- `task_id` (FK → tasks.id, nullable，本地任务可选)
- `provider` (string，如 `'jira' | 'linear' | 'github-issues'`)
- `external_id` (string, not null，外部系统的 Issue ID)
- `url` (string, not null)
- `summary` (string, nullable，外部 Issue 标题快照)
- `status` (string, nullable，外部状态快照)
- `metadata` (jsonb/text，包含优先级、labels 等外部字段快照)
- `created_at` (timestamp, not null)
- `updated_at` (timestamp, not null)

**索引建议：**

- `idx_external_issue_links_project_id`
- `idx_external_issue_links_task_id`
- 唯一约束：(`provider`, `external_id`)

---

## 4. `webhook_event_logs` 表（可选）

**用途**：记录来自外部系统的 Webhook 事件，便于调试与补偿重放。

**字段建议：**

- `id` (PK, string/uuid)
- `provider` (string，如 `'github' | 'gitlab' | 'jira'`)
- `integration_config_id` (FK → integration_configs.id, nullable)
- `event_type` (string，如 GitHub 的 `pull_request`, `push`，Jira 的 `issue_updated` 等)
- `payload` (jsonb/text，原始事件内容，敏感字段可脱敏)
- `parsed_result` (jsonb/text，将事件解析成内部标准事件结构)
- `status` (string，如 `'received' | 'processed' | 'error'`)
- `error_message` (string, nullable)
- `created_at` (timestamp, not null)

**索引建议：**

- `idx_webhook_events_provider_created_at`
- `idx_webhook_events_status`

---

## 5. 与其他模块的数据关系

- **Project**
  - `integration_configs.project_id` 绑定项目级集成。
  - `external_issue_links.project_id` 与项目内任务关联。
- **Task**
  - `external_issue_links.task_id` 标记任务对应的外部 Issue。
- **Git / Notification / AIHub**
  - Webhook 事件解析后通过消息总线分发给对应模块，参考 `parsed_result` 字段。

---

## 6. Prisma 风格 Schema 参考

```ts
model IntegrationConfig {
  id         String   @id @default(cuid())
  provider   String
  scope      String
  projectId  String?
  name       String
  config     Json
  enabled    Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  createdBy  String?
}

model ExternalIssueLink {
  id         String   @id @default(cuid())
  projectId  String
  taskId     String?
  provider   String
  externalId String
  url        String
  summary    String?
  status     String?
  metadata   Json?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model WebhookEventLog {
  id                 String   @id @default(cuid())
  provider           String
  integrationConfigId String?
  eventType          String
  payload            Json?
  parsedResult       Json?
  status             String
  errorMessage       String?
  createdAt          DateTime @default(now())
}
```

---

随着集成复杂度增加，可按 provider 继续拆分更具体的表（如 CI 构建记录表），但本模型足够作为统一接入层的基础。***

