# AIHub 模块 API 设计（api-ai-hub）

前缀统一为：`/_api`。

---

## 1. 接口清单概览

| 领域          | 方法 | 路径                                  | 描述                    |
|---------------|------|---------------------------------------|-------------------------|
| Chat          | POST | `/ai/chat`                           | 执行一次 AI 对话        |
| Conversation  | GET  | `/ai/conversations`                  | 获取会话列表            |
| Conversation  | GET  | `/ai/conversations/{id}`             | 获取会话详情（含消息）  |
| Conversation  | POST | `/ai/conversations/{id}/messages`    | 在会话中追加消息        |
| Workflow      | GET  | `/ai/workflows`                      | 获取工作流定义列表      |
| Workflow      | GET  | `/ai/workflows/{id}`                 | 获取单个工作流定义      |
| Workflow      | POST | `/ai/workflows/{id}/run`             | 运行指定工作流          |
| WorkflowRun   | GET  | `/ai/workflow-runs`                  | 查询工作流运行记录      |
| WorkflowRun   | GET  | `/ai/workflow-runs/{id}`             | 获取运行详细状态        |
| Model         | GET  | `/ai/models`                         | 获取可用模型列表        |
| Usage         | GET  | `/ai/usage`                          | 查询 AI 使用与成本统计  |

WebSocket 事件：

- `ai.stream`：对话回复流。
- `ai.workflow.update`：工作流执行状态更新。

---

## 2. Chat / Conversation API

### 2.1 执行一次对话 `POST /_api/ai/chat`

**请求体：**

```json
{
  "projectId": "proj_1",
  "taskId": "task_1",
  "conversationId": "conv_1",
  "message": {
    "role": "user",
    "content": "帮我分析这个任务的风险"
  },
  "contextHints": {
    "includeGitDiff": true,
    "includeRecentActivities": true
  },
  "modelPreference": "gpt-4o"
}
```

**响应示例：**

```json
{
  "data": {
    "conversationId": "conv_1",
    "message": {
      "id": "msg_2",
      "role": "assistant",
      "content": "……AI 分析内容……",
      "modelName": "gpt-4o"
    }
  }
}
```

若使用 WebSocket，可只返回基本信息，正文通过 `ai.stream` 事件流式推送。

---

### 2.2 获取会话列表 `GET /_api/ai/conversations`

**查询参数：**

- `projectId` (string, optional)
- `taskId` (string, optional)
- `q` (string, optional，按标题/内容搜索)
- `from`, `to` (timestamp, optional)
- 分页参数。

---

### 2.3 获取会话详情 `GET /_api/ai/conversations/{id}`

**行为：**

- 返回会话元数据以及最近 N 条消息（完整消息可分页加载）。

---

## 3. 工作流 API

### 3.1 获取工作流定义列表 `GET /_api/ai/workflows`

**响应示例：**

```json
{
  "data": [
    {
      "id": "wflow_code_review",
      "key": "ai-code-review",
      "name": "AI 代码审查",
      "description": "对 PR 中的代码变更进行审查",
      "version": 1
    }
  ]
}
```

---

### 3.2 运行指定工作流 `POST /_api/ai/workflows/{id}/run`

**请求体：**

```json
{
  "projectId": "proj_1",
  "taskId": "task_123",
  "parameters": {
    "prId": "pr_456",
    "severityThreshold": "medium"
  },
  "triggerType": "manual"
}
```

**响应示例：**

```json
{
  "data": {
    "workflowRunId": "run_1",
    "status": "pending"
  }
}
```

后续通过 WebSocket `ai.workflow.update` 接收进度与结果。

---

### 3.3 查询工作流运行记录 `GET /_api/ai/workflow-runs`

**查询参数：**

- `workflowId`, `projectId`, `taskId`, `status`, `from`, `to` 等。

---

## 4. 模型与使用统计 API

### 4.1 获取可用模型列表 `GET /_api/ai/models`

**响应示例：**

```json
{
  "data": [
    {
      "id": "model_gpt4o",
      "name": "gpt-4o",
      "provider": "openai",
      "taskTypes": ["quick-summary","code-generation"],
      "maxTokens": 16000,
      "enabled": true
    }
  ]
}
```

---

### 4.2 查询 AI 使用与成本统计 `GET /_api/ai/usage`

**查询参数：**

- `userId`, `projectId`, `modelName`, `from`, `to`。

**响应示例：**

```json
{
  "data": {
    "totalTokens": 123456,
    "totalCost": 12.34,
    "byModel": [
      {
        "modelName": "gpt-4o",
        "totalTokens": 100000,
        "totalCost": 10.0
      }
    ]
  }
}
```

---

## 5. 错误码示例

- `AI_MODEL_NOT_AVAILABLE`：指定模型不可用。
- `AI_WORKFLOW_NOT_FOUND`：工作流不存在。
- `AI_WORKFLOW_RUN_NOT_FOUND`：运行记录不存在。***

