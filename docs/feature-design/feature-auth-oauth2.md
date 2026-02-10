# Auth-OAuth2 模块功能技术说明书（联机版本认证与权限）

## 1. 概述

**Auth-OAuth2 模块**是在 User/Auth 基础上的联机版认证与授权扩展，用于在内网/服务器部署场景下，通过 OAuth2.0 / OIDC 与企业或第三方身份提供商集成，实现单点登录（SSO）与统一权限管理。

该模块与现有 `User/Auth` 模块共享用户与角色模型，主要增加：OAuth2.0 授权流程、Token 管理、IdP 集成与安全控制。

## 2. 目标与范围

- **目标**
  - 支持通过 OAuth2.0 / OIDC 与企业 IdP（如 Azure AD、Okta、Keycloak 等）集成。
  - 实现 Web（浏览器）与桌面（Electron）统一的单点登录体验。
  - 将外部 IdP 的用户信息与角色/组映射为本地用户与项目角色。

- **范围**
  - 授权码模式（Authorization Code + PKCE）登录流程。
  - 回调处理、Token 交换与刷新。
  - 用户自动创建/绑定与角色映射。
  - 与现有 RBAC 模型的集成。

## 3. 使用场景

- 内网部署时，通过公司 SSO 登录系统，无需单独管理密码。
- 桌面客户端（Electron）通过内嵌浏览器窗口完成 OAuth2.0 登录，复用相同后端逻辑。
- 不同项目或环境使用不同的 OAuth2.0 Provider（测试/生产环境 IdP 隔离）。

## 4. 功能需求拆解

### 4.1 OAuth2.0 Provider 管理

- **FR-AUTH-OA-01 Provider 配置**
  - 支持配置多个 OAuth2.0 / OIDC Provider：
    - `issuer` / 授权端点 / Token 端点 / UserInfo 端点。
    - `clientId`, `clientSecret`, `redirectUri` 列表。
    - 支持选择作用范围：全局或特定项目/工作区。
  - 支持导入 OIDC Discovery 文档自动填充端点信息。

- **FR-AUTH-OA-02 Provider 状态监控**
  - 能检测 Provider 可用性（例如开机时简单探活）。
  - 在配置错误/不可用时，在设置界面与日志中给出清晰提示。

### 4.2 登录与授权流程

- **FR-AUTH-OA-10 浏览器端登录**
  - 使用 OAuth2.0 授权码模式 + PKCE：
    - 前端发起 `/auth/oauth2/authorize?provider={id}` 请求。
    - 跳转到 IdP 登录页面，用户完成认证与授权。
    - IdP 回调到后端 `redirectUri`，后端交换 Token 并创建/更新会话。
  - 登录完成后，将用户重定向回前端应用入口（携带会话信息或使用 Cookie）。

- **FR-AUTH-OA-11 Electron 客户端登录**
  - Electron 通过内嵌浏览器窗口打开同一授权 URL。
  - 回调 URI 指向后端，对 Electron 来说与浏览器登录流程一致。
  - 可选：使用自定义 URL Scheme 将登录结果回传给桌面应用。

### 4.3 用户映射与角色管理

- **FR-AUTH-OA-20 用户自动创建与绑定**
  - 对首次登录用户：
    - 根据 IdP 返回的 `sub` / `email` / `preferred_username` 创建本地 User 记录。
    - 记录外部 IdP 标识（如 `externalId`, `provider`）。
  - 对已存在用户：
    - 将外部 `sub` 与本地用户绑定，避免重复创建。

- **FR-AUTH-OA-21 角色/组映射**
  - 支持从 IdP 声明（claims）中获取用户组/角色信息（如 `groups`, `roles`）。
  - 在配置中可以将外部组/角色映射为本地项目角色（Owner/Maintainer/Member/Guest）。
  - 支持单向同步（登录时更新角色），也支持关闭自动映射（仅管理员手动配置）。

### 4.4 Token 与会话管理

- **FR-AUTH-OA-30 Token 存储与刷新**
  - 在后端安全存储 Access Token 与 Refresh Token（加密存储）。
  - 为需要访问外部 IdP API 的场景提供 Token 刷新能力。

- **FR-AUTH-OA-31 单点登出（可选）**
  - 支持调用 IdP 的登出端点（如有）以实现单点登出。
  - 支持本地会话失效（即使不支持真正全局 SLO）。

## 5. 接口设计

### 5.1 REST 端点（示例）

- `GET /_api/auth/oauth2/providers`
  - 功能：列出可用 Provider 及其基本信息。

- `GET /_api/auth/oauth2/authorize`
  - 功能：发起 OAuth2.0 授权请求。
  - 查询参数：`provider`（必填）、`redirectUri?`（可选覆盖默认值）。

- `GET /_api/auth/oauth2/callback`
  - 功能：处理 IdP 回调，交换 Token 并创建本地会话。
  - 查询参数：`code`, `state` 等（由 IdP 返回）。

- `POST /_api/auth/oauth2/logout`
  - 功能：注销当前会话，并可选调用 IdP 登出。

### 5.2 与现有 User/Auth 的关系

- 与 `/_api/auth/login`（本地账号登录）并存：
  - 可通过配置决定是否允许本地账号登录或强制使用 SSO。
- `GET /_api/auth/me` 返回的用户信息中增加：
  - 当前登录方式（本地/OAuth2）。
  - 关联的 Provider 信息与外部标识。

## 6. 安全要求

- 全程 HTTPS（在内网环境也应通过反向代理确保）。
- 使用 PKCE 防止授权码拦截攻击。
- Access Token/Refresh Token 加密存储，避免泄露。
- 对回调端点增加 CSRF 防护与严格的 `state` 校验。

## 7. 与其他模块的交互

- **User/Auth 模块**
  - 统一维护 User、Session 与 RoleAssignment。
  - 对上层模块隐藏具体认证方式。

- **Integration 模块**
  - 可复用 OAuth2.0 配置与 Token 管理能力接入其他 SaaS。

- **Plugin 模块**
  - 插件通过 User/Auth 提供的权限检查接口判断当前用户是否可以执行某项操作（与认证来源无关）。

