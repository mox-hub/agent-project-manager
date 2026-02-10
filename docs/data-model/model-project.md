# Project 模块数据模型设计（model-project）

本文件描述 Project 领域的核心数据模型，包括 **Project / Task / Iteration / 里程碑 / 依赖 / 标签关联 / 项目成员 / 任务动态** 等实体，以及它们在关系型数据库（SQLite / PostgreSQL）中的推荐表结构设计。  
实现层假设使用 TypeScript + ORM（如 Prisma/TypeORM），但本文件以**逻辑模型 + 表结构**为主。

---

## 1. 设计目标与范围

- 支撑：
  - 多项目、多仓库、多成员协作。
  - 任务树（父子任务）、任务依赖、迭代（Sprint）。
  - 与 AI、Git、Terminal、Integration、Notification 等模块的关联。
- 满足：
  - 单机（SQLite）与内网服务器（PostgreSQL）统一的数据结构。
  - 后续易于扩展（插件扩展字段、标签、元数据等）。

本模块主要实体：

- `Project`：项目。
- `ProjectMember`：项目成员与角色。
- `Iteration`：迭代（Sprint）。
- `Milestone`：里程碑（跨迭代或单迭代的重要节点）。
- `Task`：任务与子任务。
- `TaskDependency`：任务依赖关系。
- `TaskTag`：任务与标签（Tag）的关联（Tag 定义在 Project-Metadata 模块）。
- `TaskActivity`：任务动态（状态变更、评论、字段修改等时间线）。

---

## 2. 实体与关系概览

### 2.1 实体关系简图（逻辑）

- Project 1 - N ProjectMember
- Project 1 - N Iteration
- Project 1 - N Milestone
- Project 1 - N Task
- Iteration 1 - N Task（可选）
- Milestone 1 - N Task（通过中间表，可选，后文说明）
- Task 1 - N 子 Task（自引用父子关系）
- Task N - N Task（通过 TaskDependency 表实现依赖）
- Task N - N Tag（通过 TaskTag 关联，Tag 定义在 Project-Metadata）
- Task 1 - N TaskActivity

---

## 3. Project 相关表

### 3.1 `projects` 表

**用途**：存储项目的基础信息与配置。

**字段建议：**

- `id` (PK, string/uuid)
- `name` (string, not null)
- `description` (text, nullable)
- `type` (enum/string, 如 `'personal' | 'team' | 'experiment' | 'enterprise'`)
- `visibility` (enum/string, `'private' | 'internal' | 'public'`)
- `status` (enum/string, `'active' | 'archived'`)
- `config` (jsonb/text, 可存放项目配置，如 AI 模型偏好、默认分支等)
- `created_by` (string/uuid, FK → users.id)
- `created_at` (timestamp, not null)
- `updated_at` (timestamp, not null)

**索引建议：**

- `idx_projects_status`
- `idx_projects_created_by`
- 组合索引 `idx_projects_visibility_status` 便于列表过滤。

---

### 3.2 `project_members` 表

**用途**：记录项目成员与其角色（与 User/Auth 的 RoleAssignment 补充配合使用）。

**字段建议：**

- `project_id` (PK part, FK → projects.id)
- `user_id` (PK part, FK → users.id)
- `role` (enum/string, 如 `'owner' | 'maintainer' | 'member' | 'guest'`)
- `joined_at` (timestamp, not null)
- `metadata` (jsonb/text, 可存储一些额外信息，如外部系统映射)

**索引建议：**

- PK (`project_id`, `user_id`)
- `idx_project_members_user_id`

---

## 4. Iteration（迭代）与 Milestone（里程碑）相关表

### 4.1 `iterations` 表

**用途**：表示某个项目下的迭代周期（Sprint）。

**字段建议：**

- `id` (PK, string/uuid)
- `project_id` (FK → projects.id, not null)
- `name` (string, not null)
- `goal` (text, nullable)
- `start_date` (date/timestamp, not null)
- `end_date` (date/timestamp, not null)
- `capacity` (int, nullable，用于估算工作量，单位可配置)
- `status` (enum/string, 如 `'planned' | 'active' | 'completed' | 'cancelled'`)
- `created_at` (timestamp, not null)
- `updated_at` (timestamp, not null)

**索引建议：**

- `idx_iterations_project_id`
- `idx_iterations_project_id_status`

---

### 4.2 `milestones` 表

**用途**：表示项目级或迭代内的重要里程碑节点，可与一个或多个任务关联。

**字段建议：**

- `id` (PK, string/uuid)
- `project_id` (FK → projects.id, not null)
- `iteration_id` (FK → iterations.id, nullable，用于标记属于某个迭代的里程碑)
- `name` (string, not null)
- `description` (text, nullable)
- `target_date` (date/timestamp, nullable，目标完成时间)
- `status` (enum/string, 如 `'planned' | 'in_progress' | 'reached' | 'missed' | 'cancelled'`)
- `metadata` (jsonb/text，用于插件或集成扩展字段)
- `created_at` (timestamp, not null)
- `updated_at` (timestamp, not null)

**索引建议：**

- `idx_milestones_project_id`
- `idx_milestones_project_id_status`
- `idx_milestones_iteration_id`

---

### 4.3 `milestone_tasks` 表（里程碑与任务关联，可选）

**用途**：里程碑与任务间的多对多关系（某个里程碑可以由多个任务共同达成，某个任务也可以影响多个里程碑）。

**字段建议：**

- `milestone_id` (PK part, FK → milestones.id)
- `task_id` (PK part, FK → tasks.id)
- `project_id` (FK → projects.id，冗余方便过滤)
- `metadata` (jsonb/text，可留给插件扩展，例如标记“主任务/辅助任务”等)

**索引建议：**

- PK (`milestone_id`, `task_id`)
- `idx_milestone_tasks_task_id`

---

## 5. Task（任务）及子任务相关表

### 5.1 `tasks` 表

**用途**：存储任务/子任务的主体信息。

**字段建议：**

- `id` (PK, string/uuid)
- `project_id` (FK → projects.id, not null)
- `iteration_id` (FK → iterations.id, nullable)
- `parent_task_id` (FK → tasks.id, nullable，自引用，用于子任务)
- `title` (string, not null)
- `description` (text, nullable)
- `status` (string/enum，建议与 Project-Metadata 的 StatusDefinition 对应，如 key)
- `priority` (string/enum，如 `'low' | 'medium' | 'high' | 'critical'`)
- `assignee_id` (FK → users.id, nullable)
- `reporter_id` (FK → users.id, nullable)
- `due_date` (date/timestamp, nullable)
- `estimate` (int, nullable，预估工作量，单位如 story points 或 hours)
- `actual_spent` (int, nullable，实际耗时，单位与 estimate 对应)
- `ai_suggestion` (jsonb/text, 可存最近一次 AI 建议摘要或结构化结果)
- `git_refs` (jsonb/text, 记录关联的 commit/branch/pr id 列表)
- `metadata` (jsonb/text, 插件/集成的扩展字段)
- `created_at` (timestamp, not null)
- `updated_at` (timestamp, not null)

**索引建议：**

- `idx_tasks_project_id`
- `idx_tasks_project_id_status`
- `idx_tasks_assignee_id_status`
- `idx_tasks_iteration_id`
- `idx_tasks_parent_task_id`

> **关于子任务（Sub-task）设计说明：**
>
> - 使用 `parent_task_id` 自引用实现任意深度的任务树结构。
> - 业务层可限制最大深度（例如 3 层：Epic → Story → Sub-task），数据库层不强制。
> - 可通过视图或递归查询（CTE）方便获取某个任务的子树或祖先链。

---

### 5.2 `task_dependencies` 表

**用途**：表示任务间的依赖关系，例如 “B 依赖 A 完成”。

**字段建议：**

- `id` (PK, string/uuid)
- `project_id` (FK → projects.id, not null，为了快速过滤)
- `task_id` (FK → tasks.id, not null) — 当前任务
- `depends_on_task_id` (FK → tasks.id, not null) — 依赖的前置任务
- `type` (enum/string, 可选 `blocks`/`relates` 等，初期可仅使用 `blocks`)
- `created_at` (timestamp, not null)

**索引建议：**

- `idx_task_dependencies_task_id`
- `idx_task_dependencies_depends_on_task_id`
- 唯一约束：(`task_id`, `depends_on_task_id`)

---

### 5.3 `task_tags` 表（与 Tag 的多对多关联）

> Tag 的定义在 Project-Metadata 模块，表如 `tags`。这里只是关联表。

**字段建议：**

- `task_id` (PK part, FK → tasks.id)
- `tag_id` (PK part, FK → tags.id)
- `project_id` (FK → projects.id，可冗余，方便按项目过滤)

**索引建议：**

- PK (`task_id`, `tag_id`)
- `idx_task_tags_tag_id`
---

## 6. TaskActivity（任务动态）相关表

### 6.1 `task_activities` 表

**用途**：记录任务的时间线动态，包括状态变更、字段变更、评论、系统事件以及插件自定义事件，便于审计、回溯与 UI 活动流展示。

**字段建议：**

- `id` (PK, string/uuid)
- `project_id` (FK → projects.id, not null)
- `task_id` (FK → tasks.id, not null)
- `actor_id` (FK → users.id, nullable，系统自动事件可为空或使用特殊标识)
- `type` (string/enum，如 `status_changed`, `comment`, `field_changed`, `linked_git`, `ai_suggestion_applied`, `plugin_event` 等)
- `timestamp` (timestamp, not null)
- `summary` (string, nullable，简短文本摘要，用于列表快速展示)
- `detail` (jsonb/text，存储结构化详情，例如旧值/新值、评论正文、关联对象 ID 等)
- `source` (string，标记来源：`'system' | 'user' | 'plugin:<id>' | 'ai'` 等)
- `metadata` (jsonb/text，用于插件进一步扩展)

**索引建议：**

- `idx_task_activities_task_id_timestamp`
- `idx_task_activities_project_id`
- `idx_task_activities_actor_id`

---

## 7. 字段与 Project-Metadata / AI / Git 的关系说明

- `tasks.status`
  - 推荐存储为 **状态 key**（如 `todo`, `in_progress`, `in_review`, `done`），在 UI 中通过 `StatusDefinition` 决定展示名称与颜色。

- `tasks.git_refs`
  - 可存数组形式的 JSON：
    - 如 `{ commits: [hash1, hash2], branches: ['feature/x'], prs: ['github:123'] }`。
  - 由 Git 模块负责维护（创建/更新任务与提交/PR 的关联）。

- `tasks.ai_suggestion`
  - 用于缓存最近一次 AI 分析结果（例如风险分析、拆分建议、评审摘要）。
  - 结构可以是：`{ lastRunAt, summary, risks[], suggestions[] }`，具体 schema 可在 AI 数据模型中细化。

---

## 8. 与其他模块的数据关系（简要）

- **User/Auth**
  - `projects.created_by` → `users.id`
  - `project_members.user_id` → `users.id`
  - `tasks.assignee_id` / `tasks.reporter_id` → `users.id`

- **AIHub**
  - `AIConversation.projectId` / `taskId` → `projects.id` / `tasks.id`
  - `AIWorkflowRun.projectId` / `taskId` → 同上。

- **Git**
  - `repositories.projectId` → `projects.id`
  - `tasks.git_refs` 通过 Git 模块写入。

- **Notification**
  - 在 `notifications` 中引用 `projectId` / `taskId` 字段，标记关联项目/任务。
  - 任务动态（`task_activities`）中的重要事件也可触发通知。

- **Project-Metadata**
  - `task_tags` 通过 `tag_id` 与 `tags` 表关联。
  - `tasks.status` 逻辑上引用 `status_definitions` 中的某个 key。

---

## 9. 示例：Prisma 风格的 Schema 片段（参考）

> 仅作参考，不是强制实现方式。

```ts
model Project {
  id          String           @id @default(cuid())
  name        String
  description String?
  type        String
  visibility  String
  status      String
  config      Json?
  createdBy   String
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  members     ProjectMember[]
  iterations  Iteration[]
  milestones  Milestone[]
  tasks       Task[]
}

model ProjectMember {
  projectId String
  userId    String
  role      String
  joinedAt  DateTime @default(now())

  project   Project  @relation(fields: [projectId], references: [id])

  @@id([projectId, userId])
}

model Iteration {
  id        String   @id @default(cuid())
  projectId String
  name      String
  goal      String?
  startDate DateTime
  endDate   DateTime
  capacity  Int?
  status    String

  project   Project  @relation(fields: [projectId], references: [id])
  tasks     Task[]
}

model Milestone {
  id         String   @id @default(cuid())
  projectId  String
  iterationId String?
  name       String
  description String?
  targetDate DateTime?
  status     String
  metadata   Json?

  project    Project   @relation(fields: [projectId], references: [id])
  iteration  Iteration? @relation(fields: [iterationId], references: [id])
  tasks      MilestoneTask[]
}

model Task {
  id            String      @id @default(cuid())
  projectId     String
  iterationId   String?
  parentTaskId  String?
  title         String
  description   String?
  status        String
  priority      String
  assigneeId    String?
  reporterId    String?
  dueDate       DateTime?
  estimate      Int?
  actualSpent   Int?
  aiSuggestion  Json?
  gitRefs       Json?
  metadata      Json?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  project       Project     @relation(fields: [projectId], references: [id])
  iteration     Iteration?  @relation(fields: [iterationId], references: [id])
  parentTask    Task?       @relation("TaskToSubTasks", fields: [parentTaskId], references: [id])
  subTasks      Task[]      @relation("TaskToSubTasks")
  dependencies  TaskDependency[]     @relation("TaskDeps")
  blockedBy     TaskDependency[]     @relation("TaskBlockedBy")
  taskTags      TaskTag[]
  activities    TaskActivity[]
}

model TaskDependency {
  id               String @id @default(cuid())
  projectId        String
  taskId           String
  dependsOnTaskId  String
  type             String

  task             Task   @relation("TaskDeps", fields: [taskId], references: [id])
  dependsOnTask    Task   @relation("TaskBlockedBy", fields: [dependsOnTaskId], references: [id])
}

model TaskTag {
  taskId    String
  tagId     String
  projectId String

  task      Task   @relation(fields: [taskId], references: [id])

  @@id([taskId, tagId])
}

model MilestoneTask {
  milestoneId String
  taskId      String
  projectId   String
  metadata    Json?

  milestone   Milestone @relation(fields: [milestoneId], references: [id])
  task        Task      @relation(fields: [taskId], references: [id])

  @@id([milestoneId, taskId])
}

model TaskActivity {
  id        String   @id @default(cuid())
  projectId String
  taskId    String
  actorId   String?
  type      String
  timestamp DateTime @default(now())
  summary   String?
  detail    Json?
  source    String?
  metadata  Json?

  project   Project @relation(fields: [projectId], references: [id])
  task      Task    @relation(fields: [taskId], references: [id])
}
```

---

后续如果你确认这个 Project 领域模型（含里程碑、子任务与任务动态设计）没问题，我们可以在 `docs/data-model/model-user-auth.md`、`model-ai-hub.md` 等文件中继续补齐其它模块的数据模型，并在需要时为插件扩展设计通用的扩展表模式。***
