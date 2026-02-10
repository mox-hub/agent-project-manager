# API 总览（/docs/api）

本目录用于描述本系统的 HTTP API 设计，包括：

- 统一约定（鉴权、错误格式、分页、命名规范等）
- 各功能模块的具体 API（项目、任务、AIHub、Git、终端、插件、用户与认证、通知、集成、元数据、核心配置等）

所有 API 均默认前缀为：`/_api`。

---

## 1. 认证与鉴权

- 采用 **Bearer Token** 或 **Cookie Session**：
  - Header：`Authorization: Bearer <access_token>`
  - 或使用后端管理的 Session Cookie（如 `sid`）。
- 某些公开/本机调试接口可不需要认证（如健康检查）。
- 细粒度权限控制由服务端根据当前用户身份和 `RoleAssignment` + 项目成员关系进行判断。

---

## 2. 请求与响应格式

- 所有请求和响应使用 JSON 格式，除非另有说明（例如文件下载）。
- 成功响应：

```json
{
  "data": { /* 业务数据 */ },
  "meta": { /* 分页等元信息，可选 */ }
}
```

- 失败响应：

```json
{
  "error": {
    "code": "string",          // 机器可读错误码，如 PROJECT_NOT_FOUND
    "message": "string",       // 人类可读信息
    "details": { /* 可选，附加信息 */ }
  }
}
```

---

## 3. 分页与过滤

- 通用分页参数（GET 列表接口）：
  - `page`: 页码，从 1 开始。
  - `pageSize`: 每页大小，默认 20，上限可配置（如 100）。
- 响应中的 `meta` 建议包含：

```json
{
  "data": [/* items */],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 123
  }
}
```

---

## 4. 约定的 HTTP 方法语义

- `GET`：获取资源或资源列表。
- `POST`：创建资源或执行动作（无幂等保证）。
- `PUT`：整体更新资源（幂等）。
- `PATCH`：部分更新资源（幂等）。
- `DELETE`：删除资源。

---

## 5. 模块划分文档

本目录下按模块拆分 API 文档，命名规范：`api-[模块名].md`，例如：

- `api-project.md`：项目、迭代、任务、里程碑、任务动态相关 API。
- `api-user-auth.md`：用户与本地认证 API。
- `api-auth-oauth2.md`：OAuth2/OIDC 相关 API。
- `api-ai-hub.md`：AI 对话、工作流、模型路由与使用统计 API。
- `api-git.md`：仓库、提交、PR 相关 API。
- `api-terminal.md`：终端会话与命令执行 API。
- `api-plugin.md`：插件安装、配置、事件相关 API。
- `api-notification.md`：通知与通知偏好 API。
- `api-project-metadata.md`：标签、状态、角色与模板 API。
- `api-integration.md`：外部集成配置与 Issue 链接 API。
- `api-core.md`：App 配置、审计日志、系统事件 API。

各模块文档中会遵循统一结构：

1. 概述与前缀
2. 接口清单表（快速索引）
3. 每个接口的详细说明（路径、方法、参数、请求体/响应体示例）***

