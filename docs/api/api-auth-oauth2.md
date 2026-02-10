# Auth-OAuth2 模块 API 设计（api-auth-oauth2）

前缀统一为：`/_api`。

> 这些接口依赖于浏览器/Electron 的重定向流程，主要用于发起 OAuth2.0 授权与处理回调。

---

## 1. 接口清单概览

| 领域       | 方法 | 路径                           | 描述                          |
|------------|------|--------------------------------|-------------------------------|
| Provider   | GET  | `/auth/oauth2/providers`       | 列出可用 OAuth2 Provider      |
| OAuth2     | GET  | `/auth/oauth2/authorize`       | 发起 OAuth2 授权              |
| OAuth2     | GET  | `/auth/oauth2/callback`        | 处理 OAuth2 回调              |
| OAuth2     | POST | `/auth/oauth2/logout`          | 触发 OAuth2 登出（可选）      |

---

## 2. Provider 管理

### 2.1 获取可用 Provider `GET /_api/auth/oauth2/providers`

**响应示例：**

```json
{
  "data": [
    {
      "id": "prov_azure",
      "name": "Azure AD",
      "provider": "azure-ad",
      "enabled": true
    },
    {
      "id": "prov_okta",
      "name": "Okta",
      "provider": "okta",
      "enabled": false
    }
  ]
}
```

---

## 3. 授权流程

### 3.1 发起授权 `GET /_api/auth/oauth2/authorize`

**查询参数：**

- `provider` (string, required)：Provider ID，例如 `prov_azure`。
- `redirectUri` (string, optional)：覆盖默认回调地址（少用）。

**行为：**

- 服务端生成 `state`、`code_verifier`（用于 PKCE），持久化在 Session/缓存中。
- 重定向到外部 IdP 的授权 URL。

**响应：**

- `302 Found` 重定向到 IdP 登录页面。

---

### 3.2 回调处理 `GET /_api/auth/oauth2/callback`

> 该接口主要由 IdP 调用（浏览器重定向到此）。

**查询参数（由 IdP 传入）：**

- `code` (string)：授权码。
- `state` (string)：用于防 CSRF，需与本地存储的 state 匹配。

**行为：**

- 校验 `state`。
- 使用 `code` + `code_verifier` 向 Token 端点交换 Access Token / ID Token / Refresh Token。
- 通过 UserInfo 或 ID Token 获取用户信息。
- 在本地查找/创建 `User` 与 `OAuth2Account` 绑定。
- 创建本地会话（Session 或 JWT）。

**响应：**

- 通常为重定向到前端应用入口，例如 `/app`，前端随后通过 `GET /_api/auth/me` 获取用户信息。

---

### 3.3 OAuth2 登出 `POST /_api/auth/oauth2/logout`

**行为：**

- 可选：调用 IdP 的登出端点（若配置）。
- 失效本地 Session 或 Token。

**响应：**

- `204 No Content`

---

## 4. 错误处理示例

- `OAUTH2_PROVIDER_NOT_FOUND`：provider 参数无效。
- `OAUTH2_STATE_MISMATCH`：state 校验失败。
- `OAUTH2_TOKEN_EXCHANGE_FAILED`：与 IdP 交换 Token 失败。***
