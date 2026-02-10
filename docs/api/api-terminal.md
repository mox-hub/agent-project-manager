# Terminal 模块 API 设计（api-terminal）

前缀统一为：`/_api`。

---

## 1. 接口清单概览

| 领域     | 方法 | 路径                                  | 描述               |
|----------|------|---------------------------------------|--------------------|
| Session  | GET  | `/terminal/sessions`                 | 获取终端会话列表   |
| Session  | POST | `/terminal/sessions`                 | 创建终端会话       |
| Session  | GET  | `/terminal/sessions/{id}`            | 获取会话详情       |
| Session  | PATCH| `/terminal/sessions/{id}`            | 更新会话（重命名等)|
| Session  | DELETE| `/terminal/sessions/{id}`           | 关闭会话           |
| Command  | POST | `/terminal/sessions/{id}/commands`   | 在会话中执行命令   |
| Command  | GET  | `/terminal/sessions/{id}/commands`   | 获取命令执行记录   |
| Command  | GET  | `/terminal/commands/{commandId}`     | 获取命令详情       |

实时输出通过 WebSocket 事件 `terminal.output` 推送。

---

## 2. 会话 API

### 2.1 创建终端会话 `POST /_api/terminal/sessions`

**请求体：**

```json
{
  "projectId": "proj_1",
  "repoId": "repo_1",
  "name": "Backend Build",
  "shell": "pwsh",
  "cwd": "E:/code/app"
}
```

**响应示例：**

```json
{
  "data": {
    "id": "term_sess_1",
    "projectId": "proj_1",
    "repoId": "repo_1",
    "name": "Backend Build",
    "shell": "pwsh",
    "cwd": "E:/code/app",
    "status": "active",
    "createdAt": "2026-02-10T10:00:00Z"
  }
}
```

---

### 2.2 获取会话列表 `GET /_api/terminal/sessions`

**查询参数：**

- `projectId` (string, optional)
- `status` (string, optional)：`active` / `closed`

---

### 2.3 关闭会话 `DELETE /_api/terminal/sessions/{id}`

结束底层终端进程，并将会话标记为 `closed`。

---

## 3. 命令执行 API

### 3.1 在会话中执行命令 `POST /_api/terminal/sessions/{id}/commands`

**请求体：**

```json
{
  "command": "npm",
  "args": ["run", "build"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

**响应示例：**

```json
{
  "data": {
    "id": "cmd_1",
    "sessionId": "term_sess_1",
    "command": "npm",
    "args": ["run", "build"],
    "status": "running",
    "startTime": "2026-02-10T10:05:00Z"
  }
}
```

命令输出通过 WebSocket `terminal.output` 事件流式推送，载荷类似：

```json
{
  "type": "terminal.output",
  "payload": {
    "sessionId": "term_sess_1",
    "commandId": "cmd_1",
    "chunk": "Building...\n",
    "isError": false,
    "isEnd": false
  }
}
```

---

### 3.2 获取会话内命令执行记录 `GET /_api/terminal/sessions/{id}/commands`

**响应示例：**

```json
{
  "data": [
    {
      "id": "cmd_1",
      "command": "npm",
      "args": ["run", "build"],
      "status": "succeeded",
      "startTime": "2026-02-10T10:05:00Z",
      "endTime": "2026-02-10T10:06:30Z",
      "exitCode": 0
    }
  ]
}
```

---

## 4. 错误码示例

- `TERMINAL_SESSION_NOT_FOUND`：会话不存在或已关闭。
- `COMMAND_EXECUTION_FAILED`：命令执行失败（exitCode ≠ 0）。***

