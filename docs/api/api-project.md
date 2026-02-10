# Project 模块 API 设计（api-project）

前缀统一为：`/_api`。

---

## 1. 接口清单概览

| 领域       | 方法 | 路径                                  | 描述                     |
|-----------|------|---------------------------------------|--------------------------|
| Project   | GET  | `/projects`                           | 获取项目列表             |
| Project   | POST | `/projects`                           | 创建项目                 |
| Project   | GET  | `/projects/{projectId}`               | 获取项目详情             |
| Project   | PATCH| `/projects/{projectId}`               | 更新项目信息             |
| Project   | POST | `/projects/{projectId}/archive`       | 归档项目                 |
| Project   | POST | `/projects/{projectId}/restore`       | 恢复项目                 |
| Member    | GET  | `/projects/{projectId}/members`       | 获取项目成员列表         |
| Member    | POST | `/projects/{projectId}/members`       | 添加项目成员             |
| Member    | PATCH| `/projects/{projectId}/members/{userId}` | 更新成员角色        |
| Member    | DELETE| `/projects/{projectId}/members/{userId}` | 移除成员            |
| Iteration | GET  | `/projects/{projectId}/iterations`    | 获取迭代列表             |
| Iteration | POST | `/projects/{projectId}/iterations`    | 创建迭代                 |
| Iteration | PATCH| `/iterations/{iterationId}`           | 更新迭代                 |
| Iteration | DELETE| `/iterations/{iterationId}`          | 删除迭代                 |
| Milestone | GET  | `/projects/{projectId}/milestones`    | 获取里程碑列表           |
| Milestone | POST | `/projects/{projectId}/milestones`    | 创建里程碑               |
| Milestone | PATCH| `/milestones/{milestoneId}`           | 更新里程碑               |
| Milestone | DELETE| `/milestones/{milestoneId}`          | 删除里程碑               |
| Task      | GET  | `/projects/{projectId}/tasks`         | 获取任务列表             |
| Task      | POST | `/projects/{projectId}/tasks`         | 创建任务/子任务          |
| Task      | GET  | `/tasks/{taskId}`                     | 获取任务详情             |
| Task      | PATCH| `/tasks/{taskId}`                     | 更新任务                 |
| Task      | DELETE| `/tasks/{taskId}`                    | 删除任务                 |
| TaskDep   | POST | `/tasks/{taskId}/dependencies`        | 添加任务依赖             |
| TaskDep   | DELETE| `/tasks/{taskId}/dependencies/{depTaskId}` | 移除任务依赖      |
| TaskTag   | POST | `/tasks/{taskId}/tags`                | 为任务添加标签           |
| TaskTag   | DELETE| `/tasks/{taskId}/tags/{tagId}`       | 移除任务标签             |
| Activity  | GET  | `/tasks/{taskId}/activities`          | 获取任务动态             |

以下为关键接口的详细说明（其余可按同样模式补充实现）。

---

## 2. Project 相关 API

### 2.1 获取项目列表 `GET /_api/projects`

**查询参数：**

- `q` (string, optional)：按名称/描述模糊搜索。
- `status` (string, optional)：`active` / `archived`。
- `type` (string, optional)：`personal` / `team` / `experiment` / `enterprise`。
- `memberId` (string, optional)：过滤用户参与的项目。
- `page`, `pageSize`：分页参数。

**响应示例：**

```json
{
  "data": [
    {
      "id": "proj_1",
      "name": "Agent Project Manager",
      "description": "AI 驱动的项目管理工具",
      "type": "team",
      "visibility": "internal",
      "status": "active",
      "createdAt": "2026-02-01T10:00:00Z",
      "updatedAt": "2026-02-09T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```

---

### 2.2 创建项目 `POST /_api/projects`

**请求体：**

```json
{
  "name": "New Project",
  "description": "描述信息",
  "type": "team",
  "visibility": "internal",
  "repoBinding": {
    "localPath": "E:/code/app",
    "remoteUrl": "git@github.com:xxx/app.git",
    "role": "backend"
  },
  "templateId": "tmpl_123"
}
```

**响应：**

`201 Created`，返回创建好的 Project 对象。

---

## 3. Iteration 与 Milestone API（摘要）

### 3.1 创建迭代 `POST /_api/projects/{projectId}/iterations`

**请求体：**

```json
{
  "name": "Sprint 1",
  "goal": "完成 MVP 核心功能",
  "startDate": "2026-02-10",
  "endDate": "2026-02-24",
  "capacity": 40
}
```

### 3.2 创建里程碑 `POST /_api/projects/{projectId}/milestones`

**请求体：**

```json
{
  "name": "MVP 发布",
  "description": "完成基础功能并内测",
  "iterationId": "iter_1",
  "targetDate": "2026-03-01"
}
```

---

## 4. Task 与子任务 / 依赖 / 标签 / 动态 API

### 4.1 获取任务列表 `GET /_api/projects/{projectId}/tasks`

**查询参数：**

- `status` (string or string[])：过滤任务状态。
- `assigneeId` (string, optional)。
- `iterationId` (string, optional)。
- `tag` (string or string[], optional)。
- `parentTaskId` (string, optional，仅返回指定父任务的子任务)。
- `q` (string, optional，标题/描述搜索)。
- 分页参数：`page`, `pageSize`。

### 4.2 创建任务 / 子任务 `POST /_api/projects/{projectId}/tasks`

**请求体：**

```json
{
  "title": "实现 Project 列表 API",
  "description": "按照设计文档实现 REST API 与权限校验。",
  "status": "todo",
  "priority": "high",
  "assigneeId": "user_1",
  "iterationId": "iter_1",
  "parentTaskId": "task_parent_1", 
  "dueDate": "2026-02-15",
  "estimate": 8,
  "tags": ["backend", "api"]
}
```

### 4.3 添加任务依赖 `POST /_api/tasks/{taskId}/dependencies`

**请求体：**

```json
{
  "dependsOnTaskId": "task_abc",
  "type": "blocks"
}
```

### 4.4 获取任务动态 `GET /_api/tasks/{taskId}/activities`

**响应示例：**

```json
{
  "data": [
    {
      "id": "act_1",
      "type": "status_changed",
      "actorId": "user_1",
      "timestamp": "2026-02-10T09:00:00Z",
      "summary": "状态从 todo 变更为 in_progress",
      "detail": {
        "field": "status",
        "oldValue": "todo",
        "newValue": "in_progress"
      },
      "source": "user"
    }
  ]
}
```

---

## 5. 权限与错误码（示例）

- 常见错误：
  - `PROJECT_NOT_FOUND`：给定 `projectId` 不存在或无访问权限。
  - `TASK_NOT_FOUND`：任务不存在。
  - `FORBIDDEN`：当前用户无权操作该项目或任务。
  - `VALIDATION_ERROR`：请求体字段校验失败。

具体错误码与语义可在实现时在统一错误文档中细化，这里给出 Project 领域的主要路径与参数设计。***

