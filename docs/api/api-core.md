# Core 模块 API 设计（api-core）

前缀统一为：`/_api`。

---

## 1. 接口清单概览

| 领域      | 方法 | 路径                          | 描述                 |
|-----------|------|-------------------------------|----------------------|
| Config    | GET  | `/core/configs`              | 获取配置列表         |
| Config    | POST | `/core/configs`              | 创建/更新配置        |
| AuditLog  | GET  | `/core/audit-logs`           | 查询审计日志         |
| SysEvent  | GET  | `/core/system-events`        | 查询系统事件日志     |

---

## 2. 配置 API

### 2.1 获取配置列表 `GET /_api/core/configs`

**查询参数：**

- `key` (string, optional，支持前缀匹配，如 `feature.`)
- `scope` (string, optional)：`global` / `project` / `user`
- `projectId` (string, optional)
- `userId` (string, optional，通常仅管理员可用或仅限当前用户自身)

**响应示例：**

```json
{
  "data": [
    {
      "id": "cfg_1",
      "key": "ai.default_model",
      "value": "gpt-4o",
      "scope": "global",
      "projectId": null,
      "userId": null
    }
  ]
}
```

---

### 2.2 创建/更新配置 `POST /_api/core/configs`

**请求体示例：**

```json
{
  "key": "feature.git.enabled",
  "value": true,
  "scope": "global"
}
```

或项目级配置：

```json
{
  "key": "ai.default_model",
  "value": "gpt-4o-mini",
  "scope": "project",
  "projectId": "proj_1"
}
```

---

## 3. 审计日志 API

### 3.1 查询审计日志 `GET /_api/core/audit-logs`

**查询参数：**

- `actorId` (string, optional)
- `projectId` (string, optional)
- `resourceType` (string, optional)
- `resourceId` (string, optional)
- `action` (string, optional)
- `from`, `to` (timestamp, optional)
- 分页参数。

**响应示例：**

```json
{
  "data": [
    {
      "id": "audit_1",
      "actorId": "user_admin",
      "action": "plugin.installed",
      "resourceType": "plugin",
      "resourceId": "inst_1",
      "projectId": null,
      "createdAt": "2026-02-10T10:00:00Z"
    }
  ]
}
```

---

## 4. 系统事件日志 API

### 4.1 查询系统事件 `GET /_api/core/system-events`

**查询参数：**

- `level` (string, optional)：`info` / `warn` / `error`
- `category` (string, optional)：如 `message-bus`, `integration`, `ai` 等。
- `from`, `to` (timestamp, optional)
- 分页参数。

**响应示例：**

```json
{
  "data": [
    {
      "id": "evt_1",
      "level": "error",
      "category": "integration",
      "message": "GitHub Webhook 处理失败",
      "createdAt": "2026-02-10T10:10:00Z"
    }
  ]
}
```

---

## 5. 权限与错误码示例

- 仅管理员可管理 `global` 配置与查看全部审计日志。
- 项目级配置与审计日志仅项目 Owner/Maintainer 可访问。

常见错误：

- `CONFIG_KEY_INVALID`
- `FORBIDDEN`（访问审计日志/系统事件受限）***
