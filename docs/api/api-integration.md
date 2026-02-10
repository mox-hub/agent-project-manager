# Integration 模块 API 设计（api-integration）

前缀统一为：`/_api`。

---

## 1. 接口清单概览

| 领域         | 方法 | 路径                                    | 描述                       |
|--------------|------|-----------------------------------------|----------------------------|
| Config       | GET  | `/integrations`                        | 获取集成配置列表           |
| Config       | POST | `/integrations`                        | 创建/更新集成配置          |
| Config       | DELETE| `/integrations/{id}`                  | 删除集成配置               |
| ExternalIssue| GET  | `/integrations/external-issues`        | 查询外部 Issue 链接        |
| ExternalIssue| POST | `/integrations/external-issues`        | 创建/更新外部 Issue 链接   |

Webhook 接口（由外部调用）例如：`/webhook/github`, `/webhook/gitlab`, `/webhook/jira`，在实现时单独定义。

---

## 2. 集成配置 API

### 2.1 获取集成配置列表 `GET /_api/integrations`

**查询参数：**

- `provider` (string, optional)：`github` / `gitlab` / `jira` / `linear` / `slack` 等。
- `projectId` (string, optional)。

**响应示例：**

```json
{
  "data": [
    {
      "id": "int_1",
      "provider": "jira",
      "scope": "project",
      "projectId": "proj_1",
      "name": "Jira for proj_1",
      "enabled": true
    }
  ]
}
```

---

### 2.2 创建/更新集成配置 `POST /_api/integrations`

**请求体示例：**

```json
{
  "provider": "jira",
  "scope": "project",
  "projectId": "proj_1",
  "name": "Jira for proj_1",
  "config": {
    "baseUrl": "https://xxx.atlassian.net",
    "email": "bot@example.com",
    "apiToken": "secret",
    "projectKey": "APP"
  },
  "enabled": true
}
```

实现时需对敏感字段加密存储。

---

## 3. 外部 Issue 链接 API

### 3.1 查询外部 Issue 链接 `GET /_api/integrations/external-issues`

**查询参数：**

- `projectId` (string, optional)
- `taskId` (string, optional)
- `provider` (string, optional)
- `externalId` (string, optional)

---

### 3.2 创建/更新外部 Issue 链接 `POST /_api/integrations/external-issues`

**请求体示例：**

```json
{
  "projectId": "proj_1",
  "taskId": "task_1",
  "provider": "jira",
  "externalId": "APP-123",
  "url": "https://xxx.atlassian.net/browse/APP-123",
  "summary": "登录接口返回 500 错误",
  "status": "In Progress",
  "metadata": {
    "priority": "High",
    "assignee": "alice"
  }
}
```

**响应：**

返回创建/更新后的 `ExternalIssueLink` 记录。

---

## 4. Webhook 接口（概述）

- 典型路径：
  - GitHub：`POST /webhook/github`
  - GitLab：`POST /webhook/gitlab`
  - Jira：`POST /webhook/jira`
- 行为：
  - 接收外部系统事件，校验签名/密钥。
  - 将原始 payload 写入 `webhook_event_logs`。
  - 解析成内部领域事件（如构建完成、PR 更新、Issue 更新），发送到消息总线，并视情况更新本地数据或生成通知。

---

## 5. 错误码示例

- `INTEGRATION_CONFIG_NOT_FOUND`
- `INTEGRATION_PROVIDER_NOT_SUPPORTED`
- `EXTERNAL_ISSUE_LINK_CONFLICT`***

