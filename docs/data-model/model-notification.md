# Notification 模块数据模型设计（model-notification）

本文件描述通知/消息中心相关的数据模型，包括 **Notification / NotificationPreference** 等实体。

---

## 1. 实体概览

- `Notification`：单条通知记录（站内为主，其他渠道为副本）。
- `NotificationPreference`：用户/项目级的通知订阅与渠道偏好。

---

## 2. `notifications` 表

**用途**：记录每个用户的通知消息，用于站内消息中心以及外部渠道发送的基准数据。

**字段建议：**

- `id` (PK, string/uuid)
- `user_id` (FK → users.id, not null)
- `project_id` (FK → projects.id, nullable)
- `task_id` (FK → tasks.id, nullable)
- `type` (string，如 `task.assigned`, `ci.build.failed`, `ai.workflow.completed` 等)
- `title` (string, not null)
- `body` (text, nullable，渲染后的主要内容，便于站内快速展示)
- `payload` (jsonb/text，结构化数据：URL、关联对象 ID 等)
- `channels` (jsonb/text，记录此通知计划或已发送的渠道，如 `["in-app","email"]`)
- `status` (string, `'unread' | 'read'`)
- `created_at` (timestamp, not null)
- `read_at` (timestamp, nullable)
- `metadata` (jsonb/text，扩展字段，例如 Digest 分组信息等)

**索引建议：**

- `idx_notifications_user_id_created_at`
- `idx_notifications_user_id_status`
- `idx_notifications_project_id`

---

## 3. `notification_preferences` 表

**用途**：记录用户（可选结合项目）对不同事件类型与渠道的偏好设置。

**字段建议：**

- `id` (PK, string/uuid)
- `user_id` (FK → users.id, not null)
- `project_id` (FK → projects.id, nullable，全局偏好时为空)
- `event_type` (string，如 `task.*`, `git.pr.*`, `ci.*`，支持通配策略)
- `channels` (jsonb/text，启用的渠道列表，如 `["in-app"]`, `["email","slack"]`)
- `digest_frequency` (string, nullable，如 `'none' | 'daily' | 'weekly'`)
- `quiet_hours` (jsonb/text，记录静默时间段设置)
- `metadata` (jsonb/text，扩展字段)

**索引建议：**

- `idx_notification_prefs_user_id`
- `idx_notification_prefs_user_project`

> 可根据实现需要增加唯一约束，如 (`user_id`,`project_id`,`event_type`)，避免重复记录。

---

## 4. 与其他模块的数据关系

- **Project / Task**
  - `notifications.project_id/task_id` 标记通知关联的项目与任务。
- **User/Auth**
  - 通知接收者 `user_id` 与通知偏好 `notification_preferences`。
- **AIHub / Git / Integration**
  - 这些模块产生的领域事件通过 MessageBus 转换为通知，写入 `notifications`。

---

## 5. Prisma 风格 Schema 参考

```ts
model Notification {
  id         String   @id @default(cuid())
  userId     String
  projectId  String?
  taskId     String?
  type       String
  title      String
  body       String?
  payload    Json?
  channels   Json?
  status     String
  createdAt  DateTime @default(now())
  readAt     DateTime?
  metadata   Json?
}

model NotificationPreference {
  id             String   @id @default(cuid())
  userId         String
  projectId      String?
  eventType      String
  channels       Json?
  digestFrequency String?
  quietHours     Json?
  metadata       Json?
}
```

---

将来若引入通知模板存储和 A/B 测试，可以在本文件基础上新增模板表并与 `Notification` 类型关联。***
