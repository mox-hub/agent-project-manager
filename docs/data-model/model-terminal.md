# Terminal 模块数据模型设计（model-terminal）

本文件描述终端相关的数据模型，包括 **TerminalSession / CommandExecution** 等实体。

---

## 1. 实体概览

- `TerminalSession`：终端会话（与项目、仓库、Shell 类型相关）。
- `CommandExecution`：某次命令执行记录与基础结果元数据。

输出内容通常通过日志流或外部存储处理，数据库中只需存必要的结构化信息与引用。

---

## 2. `terminal_sessions` 表

**用途**：记录终端会话，用于恢复会话列表、统计使用情况、与项目/任务挂钩等。

**字段建议：**

- `id` (PK, string/uuid)
- `project_id` (FK → projects.id, nullable)
- `repo_id` (FK → repositories.id, nullable，用于 Git 上下文)
- `name` (string, nullable，会话名称，用户可自定义)
- `shell` (string, nullable，如 `'pwsh' | 'bash' | 'zsh'` 等)
- `cwd` (string, nullable，当前工作目录)
- `created_by` (FK → users.id, not null)
- `status` (string，如 `'active' | 'closed'`)
- `created_at` (timestamp, not null)
- `closed_at` (timestamp, nullable)
- `metadata` (jsonb/text，插件或扩展用，例如终端主题配置等)

**索引建议：**

- `idx_terminal_sessions_project_id`
- `idx_terminal_sessions_created_by`
- `idx_terminal_sessions_status`

---

## 3. `command_executions` 表

**用途**：记录某个终端会话中的命令执行情况（命令文本、时长、退出码等）。

**字段建议：**

- `id` (PK, string/uuid)
- `session_id` (FK → terminal_sessions.id, not null)
- `command` (string, not null，原始命令文本)
- `args` (jsonb/text，命令参数数组，nullable)
- `env` (jsonb/text，命令执行时的环境变量差异，nullable)
- `start_time` (timestamp, not null)
- `end_time` (timestamp, nullable)
- `exit_code` (int, nullable)
- `status` (string，如 `'running' | 'succeeded' | 'failed' | 'cancelled'`)
- `output_ref` (string, nullable，用于引用外部存储中的输出内容，如日志文件路径或对象存储 key)
- `metadata` (jsonb/text，包含执行统计、解析结果、AI 诊断引用等)

**索引建议：**

- `idx_command_executions_session_id_start_time`
- `idx_command_executions_status`

---

## 4. 与其他模块的数据关系

- **Project**
  - `terminal_sessions.project_id` 决定默认上下文。
- **Git**
  - `terminal_sessions.repo_id` 关联当前仓库。
- **AIHub**
  - AI 诊断逻辑可基于 `command_executions` 中的 `output_ref` 或 `metadata` 获取原始输出。
- **Notification**
  - 对关键命令失败（如 CI 脚本、本地构建）可触发通知，引用 `command_executions.id`。

---

## 5. Prisma 风格 Schema 参考

```ts
model TerminalSession {
  id         String   @id @default(cuid())
  projectId  String?
  repoId     String?
  name       String?
  shell      String?
  cwd        String?
  createdBy  String
  status     String
  createdAt  DateTime @default(now())
  closedAt   DateTime?
  metadata   Json?

  commands   CommandExecution[]
}

model CommandExecution {
  id         String   @id @default(cuid())
  sessionId  String
  command    String
  args       Json?
  env        Json?
  startTime  DateTime @default(now())
  endTime    DateTime?
  exitCode   Int?
  status     String
  outputRef  String?
  metadata   Json?

  session    TerminalSession @relation(fields: [sessionId], references: [id])
}
```

---

如需为某些命令保留完整输出内容，可在存储层设计专门的日志表或对象存储规则，本模型保持轻量。***

