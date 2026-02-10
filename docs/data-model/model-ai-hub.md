# AIHub 模块数据模型设计（model-ai-hub）

本文件描述 AIHub 领域的核心数据模型，包括 **AIConversation / AIMessage / AIWorkflowDefinition / AIWorkflowRun / AIModelConfig / AIUsageLog** 等实体。

---

## 1. 实体概览

- `AIModelConfig`：可用模型与路由配置。
- `AIConversation`：一次长期对话会话（按项目/任务归档）。
- `AIMessage`：对话中的单条消息。
- `AIWorkflowDefinition`：AI 工作流定义。
- `AIWorkflowRun`：某次工作流执行记录。
- `AIUsageLog`：模型调用及费用统计日志（可选）。

---

## 2. `ai_model_configs` 表

**用途**：记录系统中可用的模型及其元信息，用于路由与展示。

**字段建议：**

- `id` (PK, string/uuid)
- `name` (string, 如 `'gpt-4o'`, `'claude-3.5'`)
- `provider` (string, 如 `'openai'`, `'anthropic'`, `'local'`)
- `task_types` (jsonb/text，适用任务类型列表，如 `["quick-summary","code-generation"]`)
- `max_tokens` (int, nullable)
- `cost_per_1k_tokens` (numeric, nullable)
- `enabled` (boolean, default true)
- `metadata` (jsonb/text，包含模型参数、温度、top_p 等默认配置)

**索引建议：**

- `idx_ai_model_configs_provider`
- `idx_ai_model_configs_enabled`

---

## 3. `ai_conversations` 与 `ai_messages` 表

### 3.1 `ai_conversations` 表

**用途**：按项目/任务组织 AI 对话会话。

**字段建议：**

- `id` (PK, string/uuid)
- `project_id` (FK → projects.id, nullable)
- `task_id` (FK → tasks.id, nullable)
- `title` (string, nullable，自动生成或用户命名)
- `created_by` (FK → users.id, not null)
- `created_at` (timestamp, not null)
- `updated_at` (timestamp, not null)
- `metadata` (jsonb/text，保存标签、上下文快照等)

**索引建议：**

- `idx_ai_conversations_project_id`
- `idx_ai_conversations_task_id`
- `idx_ai_conversations_created_by`

### 3.2 `ai_messages` 表

**用途**：存储对话中每一条消息。

**字段建议：**

- `id` (PK, string/uuid)
- `conversation_id` (FK → ai_conversations.id, not null)
- `role` (string, `'user' | 'assistant' | 'system'`)
- `content` (text/jsonb，可以采用 text 存原文，或 jsonb 存富文本结构)
- `model_name` (string, nullable，assistant 消息使用的模型)
- `tokens` (int, nullable，本条消息消耗的 token 数)
- `metadata` (jsonb/text，例如引用的上下文片段、相关文件等)
- `created_at` (timestamp, not null)

**索引建议：**

- `idx_ai_messages_conversation_id_created_at`

---

## 4. `ai_workflow_definitions` 与 `ai_workflow_runs` 表

### 4.1 `ai_workflow_definitions` 表

**用途**：保存 AI 工作流定义（结构化步骤、条件等）。

**字段建议：**

- `id` (PK, string/uuid)
- `key` (string, unique，如 `'ai-code-review'`)
- `name` (string, not null)
- `description` (text, nullable)
- `definition` (jsonb/text，完整 DSL/步骤定义)
- `created_by` (FK → users.id, nullable，系统预置可为空)
- `version` (int, default 1)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**索引建议：**

- `idx_ai_workflow_definitions_key`

---

### 4.2 `ai_workflow_runs` 表

**用途**：记录某个工作流的执行过程与结果。

**字段建议：**

- `id` (PK, string/uuid)
- `workflow_id` (FK → ai_workflow_definitions.id, not null)
- `project_id` (FK → projects.id, nullable)
- `task_id` (FK → tasks.id, nullable)
- `trigger_type` (string，如 `'manual' | 'git-hook' | 'schedule' | 'api'`)
- `status` (string，如 `'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled'`)
- `input` (jsonb/text，调用参数快照)
- `output` (jsonb/text，最终结果摘要)
- `steps_state` (jsonb/text，每个步骤的状态与中间结果)
- `started_at` (timestamp, nullable)
- `finished_at` (timestamp, nullable)
- `created_by` (FK → users.id, nullable)

**索引建议：**

- `idx_ai_workflow_runs_workflow_id`
- `idx_ai_workflow_runs_project_id`
- `idx_ai_workflow_runs_task_id`
- `idx_ai_workflow_runs_status`

---

## 5. `ai_usage_logs` 表（可选）

**用途**：记录每次模型调用，用于成本统计与审计。

**字段建议：**

- `id` (PK, string/uuid)
- `user_id` (FK → users.id, nullable)
- `project_id` (FK → projects.id, nullable)
- `task_id` (FK → tasks.id, nullable)
- `conversation_id` (FK → ai_conversations.id, nullable)
- `workflow_run_id` (FK → ai_workflow_runs.id, nullable)
- `model_name` (string, not null)
- `provider` (string, not null)
- `prompt_tokens` (int, not null)
- `completion_tokens` (int, not null)
- `total_tokens` (int, not null)
- `estimated_cost` (numeric, nullable)
- `request_payload` (jsonb/text，敏感字段脱敏后存储)
- `response_metadata` (jsonb/text，包含延迟、错误码等)
- `created_at` (timestamp, not null)

**索引建议：**

- `idx_ai_usage_logs_user_id`
- `idx_ai_usage_logs_project_id`
- `idx_ai_usage_logs_model_name_created_at`

---

## 6. 与其他模块的数据关系

- **Project / Task**
  - `ai_conversations.project_id/task_id`。
  - `ai_workflow_runs.project_id/task_id`。
  - `ai_usage_logs.project_id/task_id`。
- **User/Auth**
  - `ai_conversations.created_by`, `ai_workflow_runs.created_by`, `ai_usage_logs.user_id`。
- **Notification**
  - AI 工作流完成等事件可以产生通知，引用 `workflow_run_id` 或 `conversation_id`。

---

## 7. Prisma 风格 Schema 参考

```ts
model AIModelConfig {
  id             String   @id @default(cuid())
  name           String
  provider       String
  taskTypes      Json?
  maxTokens      Int?
  costPer1kTokens Float?
  enabled        Boolean  @default(true)
  metadata       Json?
}

model AIConversation {
  id         String      @id @default(cuid())
  projectId  String?
  taskId     String?
  title      String?
  createdBy  String
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
  metadata   Json?

  messages   AIMessage[]
}

model AIMessage {
  id            String   @id @default(cuid())
  conversationId String
  role          String
  content       Json
  modelName     String?
  tokens        Int?
  metadata      Json?
  createdAt     DateTime @default(now())

  conversation  AIConversation @relation(fields: [conversationId], references: [id])
}

model AIWorkflowDefinition {
  id          String   @id @default(cuid())
  key         String   @unique
  name        String
  description String?
  definition  Json
  createdBy   String?
  version     Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  runs        AIWorkflowRun[]
}

model AIWorkflowRun {
  id          String   @id @default(cuid())
  workflowId  String
  projectId   String?
  taskId      String?
  triggerType String
  status      String
  input       Json?
  output      Json?
  stepsState  Json?
  startedAt   DateTime?
  finishedAt  DateTime?
  createdBy   String?

  workflow    AIWorkflowDefinition @relation(fields: [workflowId], references: [id])
}

model AIUsageLog {
  id              String   @id @default(cuid())
  userId          String?
  projectId       String?
  taskId          String?
  conversationId  String?
  workflowRunId   String?
  modelName       String
  provider        String
  promptTokens    Int
  completionTokens Int
  totalTokens     Int
  estimatedCost   Float?
  requestPayload  Json?
  responseMetadata Json?
  createdAt       DateTime @default(now())
}
```

---

确认后，我们可以在实现时根据具体 ORM 与隐私策略，调整 `requestPayload` / `responseMetadata` 是否存储及如何脱敏。***

