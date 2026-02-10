# Plugin 模块数据模型设计（model-plugin）

本文件描述插件系统相关的数据模型，包括 **InstalledPlugin / PluginConfig / PluginEventLog** 等实体。

---

## 1. 实体概览

- `InstalledPlugin`：安装的插件（及其 Manifest 快照）。
- `PluginConfig`：插件的配置与启用范围（全局/项目）。
- `PluginEventLog`：插件调用与事件日志（可选，用于调试与审计）。

Manifest 结构本身为 JSON，不在数据库中展开字段，以便向后兼容。

---

## 2. `installed_plugins` 表

**用途**：记录系统中安装的插件实例及其 Manifest 快照。

**字段建议：**

- `id` (PK, string/uuid)
- `plugin_id` (string, not null，来自 Manifest 中的唯一 ID)
- `version` (string, not null，语义化版本)
- `manifest` (jsonb/text，完整 Manifest 快照)
- `installed_from` (string，如 `'local' | 'registry' | 'git'`)
- `installed_at` (timestamp, not null)
- `installed_by` (FK → users.id, nullable)
- `enabled` (boolean, default true)
- `scope` (string, `'global' | 'project'`)
- `metadata` (jsonb/text，扩展信息，如签名校验结果等)

**索引建议：**

- `idx_installed_plugins_plugin_id_version`
- `idx_installed_plugins_scope`

---

## 3. `plugin_configs` 表

**用途**：存储插件在不同作用域（全局或项目）的配置与启用状态。

**字段建议：**

- `id` (PK, string/uuid)
- `installed_plugin_id` (FK → installed_plugins.id, not null)
- `project_id` (FK → projects.id, nullable，scope 为 project 时必填)
- `enabled` (boolean, default true)
- `config` (jsonb/text，插件自定义配置，如 API key、行为开关等)
- `created_at` (timestamp, not null)
- `updated_at` (timestamp, not null)

**索引建议：**

- `idx_plugin_configs_installed_plugin_id`
- `idx_plugin_configs_project_id`
- 唯一约束：(`installed_plugin_id`, `project_id`)

---

## 4. `plugin_event_logs` 表（可选）

**用途**：记录插件调用情况、错误与性能信息，便于调试与审计。可按需启用。

**字段建议：**

- `id` (PK, string/uuid)
- `installed_plugin_id` (FK → installed_plugins.id, not null)
- `project_id` (FK → projects.id, nullable)
- `user_id` (FK → users.id, nullable，触发调用的用户)
- `event_type` (string，如 `'api_call' | 'hook' | 'schedule'`)
- `method` (string，调用的 API 名称或 Hook 名称)
- `request` (jsonb/text，参数快照，敏感字段脱敏)
- `response` (jsonb/text，返回结果摘要或错误信息)
- `status` (string，如 `'ok' | 'error'`)
- `duration_ms` (int, nullable)
- `created_at` (timestamp, not null)

**索引建议：**

- `idx_plugin_event_logs_installed_plugin_id`
- `idx_plugin_event_logs_project_id`
- `idx_plugin_event_logs_user_id`
- `idx_plugin_event_logs_created_at`

---

## 5. 与其他模块的数据关系

- **Project**
  - `plugin_configs.project_id` 限定插件作用的项目范围。
- **User/Auth**
  - `installed_plugins.installed_by`, `plugin_event_logs.user_id`。
- **Core/MessageBus**
  - 插件事件可通过消息总线传播，日志可与此表对应。

---

## 6. Prisma 风格 Schema 参考

```ts
model InstalledPlugin {
  id           String   @id @default(cuid())
  pluginId     String
  version      String
  manifest     Json
  installedFrom String
  installedAt  DateTime @default(now())
  installedBy  String?
  enabled      Boolean  @default(true)
  scope        String
  metadata     Json?

  configs      PluginConfig[]
  eventLogs    PluginEventLog[]
}

model PluginConfig {
  id                String   @id @default(cuid())
  installedPluginId String
  projectId         String?
  enabled           Boolean  @default(true)
  config            Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  installedPlugin   InstalledPlugin @relation(fields: [installedPluginId], references: [id])
}

model PluginEventLog {
  id                String   @id @default(cuid())
  installedPluginId String
  projectId         String?
  userId            String?
  eventType         String
  method            String
  request           Json?
  response          Json?
  status            String
  durationMs        Int?
  createdAt         DateTime @default(now())

  installedPlugin   InstalledPlugin @relation(fields: [installedPluginId], references: [id])
}
```

---

后续如需支持插件版本迁移或数据迁移脚本，可在 `InstalledPlugin` 或单独表中加入迁移状态记录。***

