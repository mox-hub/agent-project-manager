# Project-Metadata 模块 API 设计（api-project-metadata）

前缀统一为：`/_api`。

---

## 1. 接口清单概览

| 领域    | 方法 | 路径                                   | 描述               |
|---------|------|----------------------------------------|--------------------|
| Tag     | GET  | `/metadata/tags`                      | 获取标签列表       |
| Tag     | POST | `/metadata/tags`                      | 创建/更新标签      |
| Tag     | DELETE| `/metadata/tags/{tagId}`             | 删除标签           |
| Status  | GET  | `/metadata/statuses`                  | 获取状态定义列表   |
| Status  | POST | `/metadata/statuses`                  | 创建/更新状态定义  |
| Status  | DELETE| `/metadata/statuses/{statusId}`      | 删除状态定义       |
| Role    | GET  | `/metadata/project-roles`             | 获取项目角色定义   |
| Role    | POST | `/metadata/project-roles`             | 创建/更新角色定义  |
| Template| GET  | `/metadata/templates/projects`        | 获取项目模板列表   |
| Template| POST | `/metadata/templates/projects`        | 创建/更新项目模板  |

---

## 2. 标签 API

### 2.1 获取标签列表 `GET /_api/metadata/tags`

**查询参数：**

- `projectId` (string, optional)：为空表示全局标签。
- `resourceType` (string, optional)：过滤适用于某类资源的标签，如 `task`。

---

### 2.2 创建/更新标签 `POST /_api/metadata/tags`

**请求体示例：**

```json
{
  "projectId": "proj_1",
  "name": "backend",
  "color": "#FF5733",
  "description": "后端相关任务",
  "resourceTypes": ["task"]
}
```

如为更新，可在体内包含 `id` 字段或使用幂等规则（`projectId + name`）进行 upsert。

---

## 3. 状态定义 API

### 3.1 获取状态定义列表 `GET /_api/metadata/statuses`

**查询参数：**

- `projectId` (string, optional)
- `type` (string, required)：`task` / `project`

---

### 3.2 创建/更新状态定义 `POST /_api/metadata/statuses`

**请求体示例：**

```json
{
  "projectId": "proj_1",
  "type": "task",
  "key": "in_review",
  "name": "待评审",
  "order": 30,
  "isFinal": false,
  "isBlockedState": false,
  "allowedNextStatusKeys": ["done", "in_progress"]
}
```

---

## 4. 项目角色定义 API

### 4.1 获取项目角色定义 `GET /_api/metadata/project-roles`

**查询参数：**

- `projectId` (string, optional)

---

### 4.2 创建/更新角色定义 `POST /_api/metadata/project-roles`

**请求体示例：**

```json
{
  "projectId": "proj_1",
  "key": "frontend-dev",
  "name": "前端开发",
  "description": "负责前端界面与交互",
  "defaultAssigneeIds": ["user_frontend_lead"]
}
```

---

## 5. 项目模板 API

### 5.1 获取项目模板列表 `GET /_api/metadata/templates/projects`

**查询参数：**

- `q` (string, optional)：按名称/描述搜索。

---

### 5.2 创建/更新项目模板 `POST /_api/metadata/templates/projects`

**请求体示例：**

```json
{
  "name": "Node.js 服务端项目模板",
  "description": "适用于典型 Node.js REST API 项目",
  "baseProjectType": "backend",
  "defaultTags": ["backend", "api"],
  "defaultStatuses": [
    {
      "type": "task",
      "key": "todo",
      "name": "待办",
      "order": 10
    }
  ],
  "defaultIterations": [
    {
      "name": "Sprint 1",
      "durationDays": 14
    }
  ],
  "defaultTasks": [
    {
      "title": "初始化项目结构",
      "children": [
        { "title": "设置 ESLint/Prettier" },
        { "title": "配置 CI" }
      ]
    }
  ]
}
```

---

## 6. 错误码示例

- `TAG_ALREADY_EXISTS`
- `STATUS_KEY_CONFLICT`
- `PROJECT_ROLE_KEY_CONFLICT`***
