# Plugin 模块 API 设计（api-plugin）

前缀统一为：`/_api`。

---

## 1. 接口清单概览

| 领域     | 方法 | 路径                              | 描述                         |
|----------|------|-----------------------------------|------------------------------|
| Plugin   | GET  | `/plugins`                      | 获取已安装插件列表           |
| Plugin   | POST | `/plugins/install`              | 安装插件                     |
| Plugin   | POST | `/plugins/{id}/enable`          | 启用插件                     |
| Plugin   | POST | `/plugins/{id}/disable`         | 禁用插件                     |
| Config   | GET  | `/plugins/{id}/configs`         | 获取插件配置（全局/项目）    |
| Config   | POST | `/plugins/{id}/configs`         | 创建/更新插件配置            |
| Runtime  | POST | `/plugins/{id}/call`            | 调用插件公开的后端方法       |

---

## 2. 插件管理 API

### 2.1 获取已安装插件列表 `GET /_api/plugins`

**查询参数：**

- `scope` (string, optional)：`global` / `project`。
- `projectId` (string, optional)：过滤指定项目启用的插件。

**响应示例：**

```json
{
  "data": [
    {
      "id": "inst_1",
      "pluginId": "jira-integration",
      "version": "1.0.0",
      "scope": "global",
      "enabled": true,
      "manifest": {
        "name": "Jira Integration",
        "type": ["integration"],
        "description": "Connect to Jira"
      }
    }
  ]
}
```

---

### 2.2 安装插件 `POST /_api/plugins/install`

**请求体：**

```json
{
  "sourceType": "registry",
  "urlOrPath": "jira-integration@1.0.0"
}
```

**行为：**

- 下载或载入插件包，验证 Manifest 与签名（如有），创建 `installed_plugins` 记录。

---

### 2.3 启用/禁用插件

`POST /_api/plugins/{id}/enable`  
`POST /_api/plugins/{id}/disable`

**行为：**

- 切换对应 `installed_plugins` 或 `plugin_configs` 的 `enabled` 状态。

---

## 3. 插件配置 API

### 3.1 获取插件配置 `GET /_api/plugins/{id}/configs`

**查询参数：**

- `projectId` (string, optional)：获取某项目的配置，否则为全局配置。

**响应示例：**

```json
{
  "data": {
    "installedPluginId": "inst_1",
    "projectId": "proj_1",
    "enabled": true,
    "config": {
      "jiraBaseUrl": "https://xxx.atlassian.net",
      "apiToken": "***"
    }
  }
}
```

---

### 3.2 创建/更新配置 `POST /_api/plugins/{id}/configs`

**请求体：**

```json
{
  "projectId": "proj_1",
  "enabled": true,
  "config": {
    "jiraBaseUrl": "https://xxx.atlassian.net",
    "email": "bot@example.com",
    "apiToken": "secret"
  }
}
```

---

## 4. 插件运行时调用 API

### 4.1 调用插件后端方法 `POST /_api/plugins/{id}/call`

> 主要面向前端/其他模块，通过统一入口调用插件定义的后端工具函数。

**请求体：**

```json
{
  "method": "jira.syncIssues",
  "params": {
    "projectKey": "APP",
    "limit": 50
  }
}
```

**响应示例：**

```json
{
  "data": {
    "syncedCount": 42,
    "lastSyncAt": "2026-02-10T10:00:00Z"
  }
}
```

**错误码示例：**

- `PLUGIN_NOT_FOUND`
- `PLUGIN_DISABLED`
- `PLUGIN_METHOD_NOT_FOUND`
- `PLUGIN_CALL_FAILED`

---

权限控制由服务端根据当前用户角色、插件权限声明（Manifest）和项目范围共同决定。***

