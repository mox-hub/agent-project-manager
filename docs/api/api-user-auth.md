# User/Auth 模块 API 设计（api-user-auth）

前缀统一为：`/_api`。

---

## 1. 接口清单概览

| 领域     | 方法 | 路径                     | 描述               |
|----------|------|--------------------------|--------------------|
| Auth     | POST | `/auth/login`            | 本地账号登录       |
| Auth     | POST | `/auth/logout`           | 注销当前会话       |
| Auth     | GET  | `/auth/me`               | 获取当前用户信息   |
| User     | GET  | `/users/{userId}`        | 获取指定用户信息   |
| User     | GET  | `/users`                | 搜索/列表用户      |
| Role     | GET  | `/users/{userId}/roles`  | 获取用户角色       |
| Role     | POST | `/users/{userId}/roles`  | 为用户分配角色     |
| Role     | DELETE | `/users/{userId}/roles/{roleAssignmentId}` | 移除角色 |

> OAuth2/OIDC 相关接口在 `api-auth-oauth2.md` 中描述。

---

## 2. 认证相关 API

### 2.1 本地登录 `POST /_api/auth/login`

**请求体：**

```json
{
  "username": "alice",
  "password": "secret"
}
```

**响应示例（使用 JWT）：**

```json
{
  "data": {
    "accessToken": "jwt-token",
    "user": {
      "id": "user_1",
      "username": "alice",
      "displayName": "Alice",
      "email": "alice@example.com"
    }
  }
}
```

如采用 Cookie Session，可只返回用户信息，由服务器设置 Cookie。

---

### 2.2 注销 `POST /_api/auth/logout`

**行为：**

- 使当前会话失效（删除 `sessions` 记录或标记过期）。
- 清理相关 Cookie（如使用 Session Cookie）。

**响应：**

- `204 No Content`

---

### 2.3 当前用户信息 `GET /_api/auth/me`

**响应示例：**

```json
{
  "data": {
    "user": {
      "id": "user_1",
      "username": "alice",
      "displayName": "Alice",
      "email": "alice@example.com",
      "avatarUrl": null,
      "timezone": "Asia/Shanghai"
    },
    "roles": [
      {
        "scopeType": "global",
        "role": "admin"
      },
      {
        "scopeType": "project",
        "projectId": "proj_1",
        "role": "owner"
      }
    ]
  }
}
```

---

## 3. 用户与角色 API

### 3.1 获取用户详情 `GET /_api/users/{userId}`

**路径参数：**

- `userId`：用户 ID。

**响应示例：**

```json
{
  "data": {
    "id": "user_1",
    "username": "alice",
    "displayName": "Alice",
    "email": "alice@example.com",
    "authProvider": "local",
    "avatarUrl": null,
    "timezone": "Asia/Shanghai",
    "isActive": true,
    "createdAt": "2026-01-01T10:00:00Z"
  }
}
```

---

### 3.2 搜索/列表用户 `GET /_api/users`

**查询参数：**

- `q` (string, optional)：按用户名/显示名/邮箱模糊搜索。
- `page`, `pageSize`：分页参数。

---

### 3.3 获取用户角色 `GET /_api/users/{userId}/roles`

**响应示例：**

```json
{
  "data": [
    {
      "id": "ra_1",
      "scopeType": "global",
      "projectId": null,
      "role": "admin"
    },
    {
      "id": "ra_2",
      "scopeType": "project",
      "projectId": "proj_1",
      "role": "owner"
    }
  ]
}
```

---

### 3.4 为用户分配角色 `POST /_api/users/{userId}/roles`

**请求体：**

```json
{
  "scopeType": "project",
  "projectId": "proj_1",
  "role": "maintainer"
}
```

**权限：**

- 仅管理员或项目 Owner 可调用。

---

### 3.5 移除角色 `DELETE /_api/users/{userId}/roles/{roleAssignmentId}`

**行为：**

- 删除指定 `role_assignments` 记录。

---

## 4. 错误与权限（示例）

- `INVALID_CREDENTIALS`：用户名或密码错误。
- `USER_INACTIVE`：用户被禁用。
- `FORBIDDEN`：当前用户无权查看/修改目标用户或角色。***

