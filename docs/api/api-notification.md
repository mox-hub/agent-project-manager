# Notification 模块 API 设计（api-notification）

前缀统一为：`/_api`。

---

## 1. 接口清单概览

| 领域        | 方法 | 路径                              | 描述                     |
|-------------|------|-----------------------------------|--------------------------|
| Notification| GET  | `/notifications`                 | 获取当前用户通知列表     |
| Notification| POST | `/notifications/read`            | 批量标记为已读           |
| Preference  | GET  | `/notifications/preferences`     | 获取当前用户通知偏好     |
| Preference  | PUT  | `/notifications/preferences`     | 更新当前用户通知偏好     |

---

## 2. 通知列表 `GET /_api/notifications`

**查询参数：**

- `status` (string, optional)：`unread` / `read`。
- `type` (string, optional)：如 `task.assigned`、`ci.*` 等。
- `projectId` (string, optional)。
- `from`, `to` (timestamp, optional)。
- 分页参数。

**响应示例：**

```json
{
  "data": [
    {
      "id": "noti_1",
      "type": "task.assigned",
      "title": "你被分配了新任务：实现 AIHub API",
      "body": "项目：Agent PM，任务：实现 AIHub /ai/chat 接口……",
      "projectId": "proj_1",
      "taskId": "task_1",
      "status": "unread",
      "createdAt": "2026-02-10T10:00:00Z"
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

## 3. 标记通知为已读 `POST /_api/notifications/read`

**请求体：**

```json
{
  "ids": ["noti_1", "noti_2"]
}
```

**响应：**

- `204 No Content`

---

## 4. 通知偏好 API

### 4.1 获取偏好 `GET /_api/notifications/preferences`

返回当前用户的全局 + 项目级偏好。

**响应示例：**

```json
{
  "data": [
    {
      "id": "pref_1",
      "projectId": null,
      "eventType": "task.*",
      "channels": ["in-app"],
      "digestFrequency": "daily",
      "quietHours": {
        "start": "22:00",
        "end": "08:00",
        "timezone": "Asia/Shanghai"
      }
    },
    {
      "id": "pref_2",
      "projectId": "proj_1",
      "eventType": "ci.*",
      "channels": ["in-app", "email"],
      "digestFrequency": "none"
    }
  ]
}
```

---

### 4.2 更新偏好 `PUT /_api/notifications/preferences`

> 可以一次性提交多条偏好设置，服务端按 `eventType`/`projectId` 进行 upsert。

**请求体示例：**

```json
{
  "preferences": [
    {
      "projectId": null,
      "eventType": "task.*",
      "channels": ["in-app"],
      "digestFrequency": "daily",
      "quietHours": {
        "start": "22:00",
        "end": "08:00",
        "timezone": "Asia/Shanghai"
      }
    },
    {
      "projectId": "proj_1",
      "eventType": "ci.*",
      "channels": ["in-app", "slack"],
      "digestFrequency": "none"
    }
  ]
}
```

**响应：**

- `200 OK`，返回更新后的偏好列表。

---

## 5. 错误码示例

- `NOTIFICATION_NOT_FOUND`
- `INVALID_NOTIFICATION_PREFERENCE`***

