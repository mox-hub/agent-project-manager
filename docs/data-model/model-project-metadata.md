# Project-Metadata 模块数据模型设计（model-project-metadata）

本文件描述项目元数据相关的数据模型，包括 **Tag / StatusDefinition / ProjectRoleDefinition / ProjectTemplate** 等实体。

---

## 1. 实体概览

- `Tag`：标签定义（全局或项目级）。
- `StatusDefinition`：任务/项目状态定义及状态机信息。
- `ProjectRoleDefinition`：项目语义角色定义。
- `ProjectTemplate`：项目模板定义。

---

## 2. `tags` 表

**用途**：定义全局与项目级标签，用于任务/项目/文档等资源分类。

**字段建议：**

- `id` (PK, string/uuid)
- `project_id` (FK → projects.id, nullable，为空时表示全局标签)
- `name` (string, not null)
- `color` (string, nullable，如 `#RRGGBB`)
- `description` (text, nullable)
- `resource_types` (jsonb/text，如 `["task","project","document"]`)
- `created_at` (timestamp, not null)
- `created_by` (FK → users.id, nullable)
- `metadata` (jsonb/text，扩展字段)

**索引建议：**

- `idx_tags_project_id`
- `idx_tags_name_project`

---

## 3. `status_definitions` 表

**用途**：定义任务或项目可用的状态及其状态机规则。

**字段建议：**

- `id` (PK, string/uuid)
- `project_id` (FK → projects.id, nullable，为空表示全局默认)
- `type` (string, `'task' | 'project'`)
- `key` (string, not null，如 `todo`, `in_progress`, `in_review`, `done`)
- `name` (string, not null，展示名称)
- `order` (int, not null，用于排序)
- `is_final` (boolean, default false，表示终止状态)
- `is_blocked_state` (boolean, default false，用于如 `blocked` 等特殊状态)
- `allowed_next_status_keys` (jsonb/text，允许的后继状态 key 列表)
- `metadata` (jsonb/text，扩展字段，如颜色等)

**索引建议：**

- `idx_status_def_project_type`
- 唯一约束：(`project_id`, `type`, `key`)

---

## 4. `project_role_definitions` 表

**用途**：定义项目内部的语义角色，如前端开发、后端开发、QA 等。

**字段建议：**

- `id` (PK, string/uuid)
- `project_id` (FK → projects.id, nullable，为空表示可被多个项目复用的模板角色)
- `key` (string, not null，如 `frontend-dev`, `backend-dev`)
- `name` (string, not null，展示名称)
- `description` (text, nullable)
- `default_assignee_ids` (jsonb/text，默认承担此角色的用户 ID 列表，可为空)
- `metadata` (jsonb/text，扩展字段)

**索引建议：**

- `idx_project_roles_project_id`
- 唯一约束：(`project_id`, `key`)

---

## 5. `project_templates` 表

**用途**：定义可复用的项目模板，包含默认标签、状态、任务结构等。

**字段建议：**

- `id` (PK, string/uuid)
- `name` (string, not null)
- `description` (text, nullable)
- `base_project_type` (string, nullable，如 `'frontend' | 'backend' | 'data-platform'`)
- `default_tags` (jsonb/text，标签 key 列表或结构体)
- `default_statuses` (jsonb/text，状态定义快照，或引用现有 status_definitions 的 key 列表)
- `default_iterations` (jsonb/text，迭代模板定义)
- `default_tasks` (jsonb/text，初始任务树模板)
- `created_by` (FK → users.id, nullable)
- `created_at` (timestamp, not null)
- `updated_at` (timestamp, not null)
- `metadata` (jsonb/text，扩展字段，如适用场景等)

**索引建议：**

- `idx_project_templates_name`

---

## 6. 与其他模块的数据关系

- **Project / Task**
  - `tags` 通过 `task_tags` 等中间表应用于任务/项目。
  - `status_definitions` 为 `tasks.status` 和 `projects.status` 提供枚举来源与流转规则。
- **Notification**
  - 根据状态变更、标签和角色定义应用不同通知策略。
- **AIHub**
  - 使用模板与标签信息优化上下文与工作流选择。

---

## 7. Prisma 风格 Schema 参考

```ts
model Tag {
  id            String   @id @default(cuid())
  projectId     String?
  name          String
  color         String?
  description   String?
  resourceTypes Json?
  createdAt     DateTime @default(now())
  createdBy     String?
  metadata      Json?
}

model StatusDefinition {
  id                    String   @id @default(cuid())
  projectId             String?
  type                  String
  key                   String
  name                  String
  order                 Int
  isFinal               Boolean  @default(false)
  isBlockedState        Boolean  @default(false)
  allowedNextStatusKeys Json?
  metadata              Json?
}

model ProjectRoleDefinition {
  id                String   @id @default(cuid())
  projectId         String?
  key               String
  name              String
  description       String?
  defaultAssigneeIds Json?
  metadata          Json?
}

model ProjectTemplate {
  id               String   @id @default(cuid())
  name             String
  description      String?
  baseProjectType  String?
  defaultTags      Json?
  defaultStatuses  Json?
  defaultIterations Json?
  defaultTasks     Json?
  createdBy        String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  metadata         Json?
}
```

---

随着实现推进，可以考虑为 `StatusDefinition` 增加关联表，显式建模状态流转关系，目前使用 JSON 形式足以支撑首版。***

