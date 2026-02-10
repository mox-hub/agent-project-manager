# User/Auth 模块数据模型设计（model-user-auth）

本文件描述用户与认证/授权相关的数据模型，包括 **User / Session / RoleAssignment / OAuth2Provider / OAuth2Account** 等实体，以及与项目角色的关系。

---

## 1. 实体概览

- `User`：系统用户。
- `Session`：登录会话。
- `RoleAssignment`：用户在项目或全局的角色分配。
- `OAuth2Provider`：外部 IdP/OAuth2 配置。
- `OAuth2Account`：用户与外部 IdP 账户的绑定。

---

## 2. `users` 表

**用途**：存储系统用户基础信息。

**字段建议：**

- `id` (PK, string/uuid)
- `username` (string, unique, not null)
- `display_name` (string, not null)
- `email` (string, unique, nullable，根据部署情况可选)
- `password_hash` (string, nullable，若仅支持 SSO 则可为空)
- `auth_provider` (string, 如 `'local' | 'oauth2' | 'mixed'`)
- `avatar_url` (string, nullable)
- `timezone` (string, nullable)
- `is_active` (boolean, default true)
- `created_at` (timestamp, not null)
- `updated_at` (timestamp, not null)

**索引建议：**

- unique `idx_users_username`
- unique `idx_users_email`（如启用邮箱）

---

## 3. `sessions` 表

**用途**：记录用户会话（用于 JWT/Session Token 管理与审计）。

**字段建议：**

- `id` (PK, string/uuid)
- `user_id` (FK → users.id, not null)
- `created_at` (timestamp, not null)
- `expires_at` (timestamp, not null)
- `last_active_at` (timestamp, not null)
- `ip_address` (string, nullable)
- `user_agent` (string, nullable)
- `metadata` (jsonb/text，插件或审计扩展用)

**索引建议：**

- `idx_sessions_user_id`
- `idx_sessions_expires_at`

---

## 4. `role_assignments` 表

**用途**：基于 RBAC 的角色分配，支持全局与项目级角色。

**字段建议：**

- `id` (PK, string/uuid)
- `user_id` (FK → users.id, not null)
- `scope_type` (string, `'global' | 'project'`)
- `project_id` (FK → projects.id, nullable，当 scope 为 project 时必填)
- `role` (string，如 `'owner' | 'maintainer' | 'member' | 'guest' | 'admin'`)
- `created_at` (timestamp, not null)

**索引建议：**

- `idx_role_assignments_user_scope`
- 唯一约束：(`user_id`, `scope_type`, `project_id`, `role`)

> 项目内的更语义化角色（如 frontend-dev、qa）在 Project-Metadata 模块中以 `ProjectRoleDefinition` 管理，这里只负责 RBAC 层。

---

## 5. OAuth2 相关表

### 5.1 `oauth2_providers` 表

**用途**：配置多个 OAuth2/OIDC Provider。

**字段建议：**

- `id` (PK, string/uuid)
- `name` (string, not null，如 `'azure-ad'`, `'okta-main'`)
- `issuer` (string, nullable，用于 OIDC discovery)
- `auth_url` (string, not null)
- `token_url` (string, not null)
- `userinfo_url` (string, nullable)
- `client_id` (string, not null)
- `client_secret` (string, encrypted, not null)
- `redirect_uris` (jsonb/text，列表)
- `scopes` (jsonb/text，默认 scope 列表)
- `enabled` (boolean, default true)
- `config` (jsonb/text，额外配置，如 groups claim 名称)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**索引建议：**

- `idx_oauth2_providers_name`

---

### 5.2 `oauth2_accounts` 表

**用途**：用户与外部 IdP 的账号绑定关系。

**字段建议：**

- `id` (PK, string/uuid)
- `user_id` (FK → users.id, not null)
- `provider_id` (FK → oauth2_providers.id, not null)
- `external_user_id` (string, not null，例如 OIDC 的 `sub`)
- `external_username` (string, nullable)
- `email` (string, nullable)
- `access_token` (string, encrypted, nullable)
- `refresh_token` (string, encrypted, nullable)
- `expires_at` (timestamp, nullable)
- `scopes` (jsonb/text, nullable)
- `raw_profile` (jsonb/text, 可选存放原始 UserInfo 响应)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**索引建议：**

- 唯一约束：(`provider_id`, `external_user_id`)
- `idx_oauth2_accounts_user_id`

---

## 6. 与其他模块的关系

- **Project / ProjectMember**
  - `project_members.user_id` 与 `role_assignments` 共同决定权限。
- **Notification**
  - 使用 `user_id` 作为通知目标，结合角色/权限进行过滤。
- **Plugin / Integration**
  - 插件或外部集成可通过 `role_assignments` 与 `users` 进行权限判定。

---

## 7. Prisma 风格 Schema 参考

```ts
model User {
  id           String   @id @default(cuid())
  username     String   @unique
  displayName  String
  email        String?  @unique
  passwordHash String?
  authProvider String
  avatarUrl    String?
  timezone     String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  sessions        Session[]
  roleAssignments RoleAssignment[]
  oauthAccounts   OAuth2Account[]
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  createdAt    DateTime @default(now())
  expiresAt    DateTime
  lastActiveAt DateTime @default(now())
  ipAddress    String?
  userAgent    String?
  metadata     Json?

  user         User     @relation(fields: [userId], references: [id])
}

model RoleAssignment {
  id         String   @id @default(cuid())
  userId     String
  scopeType  String
  projectId  String?
  role       String
  createdAt  DateTime @default(now())

  user       User     @relation(fields: [userId], references: [id])
}

model OAuth2Provider {
  id           String   @id @default(cuid())
  name         String   @unique
  issuer       String?
  authUrl      String
  tokenUrl     String
  userinfoUrl  String?
  clientId     String
  clientSecret String
  redirectUris Json?
  scopes       Json?
  enabled      Boolean  @default(true)
  config       Json?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  accounts     OAuth2Account[]
}

model OAuth2Account {
  id             String   @id @default(cuid())
  userId         String
  providerId     String
  externalUserId String
  externalUsername String?
  email          String?
  accessToken    String?
  refreshToken   String?
  expiresAt      DateTime?
  scopes         Json?
  rawProfile     Json?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user           User           @relation(fields: [userId], references: [id])
  provider       OAuth2Provider @relation(fields: [providerId], references: [id])

  @@unique([providerId, externalUserId])
}
```

---

确认本模型后，可在 `model-auth-oauth2.md` 中进一步细化 Provider 配置与 Token 审计需求，或直接在本文件基础上补充即可。***

