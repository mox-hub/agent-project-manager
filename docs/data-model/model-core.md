# Core 模块数据模型设计（model-core）

本文件描述 Core 模块涉及的持久化数据模型，主要包括 **配置（Config） / 审计日志（AuditLog） / 系统事件日志（SystemEvent）** 等。  
消息总线（MessageBus）本身多为内存/进程间机制，一般不直接落库，仅在需要持久化跟踪时记录到事件日志中。

---

## 1. 实体概览

- `AppConfig`：键值配置项（可覆盖环境变量、.env 等），支持作用域与版本。
- `AuditLog`：安全/权限相关操作审计日志。
- `SystemEvent`：系统级事件日志（可选，用于调试与运维）。

---

## 2. `app_configs` 表

**用途**：保存系统运行时可变配置，如开关、限流参数、默认模型等，便于在 UI 中配置而不重新部署。

**字段建议：**

- `id` (PK, string/uuid)
- `key` (string, not null，如 `feature.git.enabled`, `ai.default_model` 等，使用点号分隔命名空间)
- `value` (jsonb/text，配置值，支持基础类型或结构化对象)
- `scope` (string, `'global' | 'project' | 'user'`)
- `project_id` (FK → projects.id, nullable，当 scope 为 project 时使用)
- `user_id` (FK → users.id, nullable，当 scope 为 user 时使用)
- `description` (string, nullable，用于管理界面展示)
- `created_at` (timestamp, not null)
- `updated_at` (timestamp, not null)
- `created_by` (FK → users.id, nullable)
- `updated_by` (FK → users.id, nullable)

**索引建议：**

- `idx_app_configs_key_scope`
- `idx_app_configs_project_id`
- `idx_app_configs_user_id`

> 读取时优先级通常为：User → Project → Global → 环境变量，具体逻辑在 ConfigService 中实现。

---

## 3. `audit_logs` 表

**用途**：记录安全敏感操作，如权限变更、插件安装、集成配置修改等，满足审计需求。

**字段建议：**

- `id` (PK, string/uuid)
- `actor_id` (FK → users.id, nullable，系统自动操作可为空或特殊标识)
- `action` (string，如 `project.created`, `role.changed`, `plugin.installed`, `integration.updated` 等)
- `resource_type` (string，如 `'project' | 'task' | 'user' | 'plugin' | 'integration'`)
- `resource_id` (string, nullable，资源标识，如 projectId、taskId 等)
- `project_id` (FK → projects.id, nullable)
- `ip_address` (string, nullable)
- `user_agent` (string, nullable)
- `old_value` (jsonb/text，操作前的关键字段快照，可选)
- `new_value` (jsonb/text，操作后的关键字段快照，可选)
- `metadata` (jsonb/text，扩展字段，如调用来源、traceId 等)
- `created_at` (timestamp, not null)

**索引建议：**

- `idx_audit_logs_actor_id_created_at`
- `idx_audit_logs_project_id`
- `idx_audit_logs_resource`

---

## 4. `system_events` 表（可选）

**用途**：记录系统内部事件（非安全性事件），主要用于调试、监控与运维分析。  
例如：消息总线抛错、外部服务不可用、后台任务重试等。

**字段建议：**

- `id` (PK, string/uuid)
- `level` (string，如 `'info' | 'warn' | 'error'`)
- `category` (string，如 `'message-bus' | 'scheduler' | 'integration' | 'ai'`)
- `message` (string, not null)
- `context` (jsonb/text，附加上下文，如事件类型、payload 摘要等)
- `created_at` (timestamp, not null)

**索引建议：**

- `idx_system_events_level_created_at`
- `idx_system_events_category_created_at`

---

## 5. 与其他模块的数据关系

- **User/Auth**
  - `audit_logs.actor_id`、`app_configs.updated_by` 等字段，用于追踪是谁修改了哪些配置/资源。
- **Project / Plugin / Integration**
  - `audit_logs.resource_type/resource_id/project_id` 对应项目、插件、集成配置等对象。
- **Core/MessageBus**
  - 出错或重要系统事件可以写入 `system_events`，方便后续排查。

---

## 6. Prisma 风格 Schema 参考

```ts
model AppConfig {
  id         String   @id @default(cuid())
  key        String
  value      Json
  scope      String
  projectId  String?
  userId     String?
  description String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  createdBy  String?
  updatedBy  String?
}

model AuditLog {
  id           String   @id @default(cuid())
  actorId      String?
  action       String
  resourceType String
  resourceId   String?
  projectId    String?
  ipAddress    String?
  userAgent    String?
  oldValue     Json?
  newValue     Json?
  metadata     Json?
  createdAt    DateTime @default(now())
}

model SystemEvent {
  id        String   @id @default(cuid())
  level     String
  category  String
  message   String
  context   Json?
  createdAt DateTime @default(now())
}
```

---

后续如果引入集中日志/追踪系统（如 OpenTelemetry、ELK），可以减轻本表的使用压力，将 `system_events` 用于关键事件而非全量日志。***

