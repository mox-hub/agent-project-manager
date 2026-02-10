# User/Auth 模块功能技术说明书

## 1. 概述

**User/Auth 模块**负责用户身份、会话与权限控制，是所有功能模块的安全基础。  
该模块为 Project、Plugin、Integration 等提供统一的身份与角色信息，支撑多用户与团队协作场景。

## 2. 目标与范围

- **目标**
  - 提供统一的认证与授权机制（本地账户 + 内网 SSO）。
  - 以 RBAC 为基础，为各模块提供细粒度权限控制。
  - 为插件与集成模块提供安全可信的用户上下文。

- **范围**
  - 用户管理（账号、个人信息、偏好设置）。
  - 认证（本地密码、Token、SSO/OAuth2）。
  - 授权（角色、资源权限）。
  - 会话管理与审计。

## 3. 功能需求拆解

### 3.1 用户与身份

- **FR-U-01 用户注册/导入**
  - 单机模式：支持本地用户注册与密码登录。
  - 内网模式：支持从企业目录（如 LDAP/AD）或 IdP 导入用户，仅支持 SSO 登录。

- **FR-U-02 用户信息管理**
  - 支持修改显示名称、头像、时区、通知偏好等。

### 3.2 认证（Auth）

- **FR-AUTH-10 本地认证**
  - 用户名 + 密码登录。
  - 支持可选的多因素认证（例如基于 OTP）。

- **FR-AUTH-11 SSO/OAuth2**
  - 整合企业 IdP（如 Azure AD、Okta 等）进行单点登录。
  - 支持从 SSO token 映射到本地用户与角色。

- **FR-AUTH-12 会话管理**
  - 通过 JWT 或 Session Cookie 管理登录状态。
  - 支持强制注销与会话过期。

### 3.3 授权与角色

- **FR-AUTH-20 RBAC 角色模型**
  - 预置角色：Owner、Maintainer、Member、Guest。
  - 支持为不同项目设置角色与权限矩阵。

- **FR-AUTH-21 资源权限检查**
  - 在访问项目、任务、配置、插件管理等接口时统一进行权限验证。
  - 为插件调用添加额外的权限过滤（插件 + 用户双重校验）。

## 4. 接口设计

- `POST /_api/auth/login`
  - 功能：本地账号登录。
  - 请求体：`{ username, password }`.

- `POST /_api/auth/logout`
  - 功能：注销当前会话。

- `GET /_api/auth/me`
  - 功能：获取当前登录用户信息与角色。

- `GET /_api/users/:id`
  - 功能：获取指定用户信息（需具备相应权限）。

## 5. 与其他模块的交互

- 为 Project/Plugin/Integration/AI 等模块提供 `currentUser` 与 `hasPermission(user, resource, action)` 能力。
- 与 Audit/Security 模块协作记录敏感操作日志（如权限变更、插件安装等）。

## 6. 数据模型

- `User`
  - `id, username, displayName, email?, avatarUrl?, authProvider, roles[], createdAt, updatedAt`.

- `RoleAssignment`
  - `userId, projectId?, role`.

- `Session`
  - `id, userId, createdAt, expiresAt, lastActiveAt, ipAddress?, userAgent?`.

## 7. 权限与安全

- 所有敏感操作（如项目删除、权限修改、插件管理）均需 Owner 或管理员权限。
- 登录与失败尝试需限流与告警（防止暴力破解）。

