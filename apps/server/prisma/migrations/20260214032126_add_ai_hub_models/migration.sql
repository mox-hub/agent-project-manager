-- CreateTable
CREATE TABLE "AIModelConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "taskTypes" JSONB,
    "maxTokens" INTEGER,
    "costPer1kTokens" REAL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "taskId" TEXT,
    "title" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "metadata" JSONB,
    CONSTRAINT "AIConversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AIConversation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "modelName" TEXT,
    "tokens" INTEGER,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIWorkflowDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "definition" JSONB NOT NULL,
    "createdBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AIWorkflowRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "projectId" TEXT,
    "taskId" TEXT,
    "triggerType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "stepsState" JSONB,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIWorkflowRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AIWorkflowDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIWorkflowRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AIWorkflowRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIUsageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "projectId" TEXT,
    "taskId" TEXT,
    "conversationId" TEXT,
    "workflowRunId" TEXT,
    "modelName" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "estimatedCost" REAL,
    "requestPayload" JSONB,
    "responseMetadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIUsageLog_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AIUsageLog_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "AIWorkflowRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "idx_ai_model_configs_provider" ON "AIModelConfig"("provider");

-- CreateIndex
CREATE INDEX "idx_ai_model_configs_enabled" ON "AIModelConfig"("enabled");

-- CreateIndex
CREATE INDEX "idx_ai_conversations_project_id" ON "AIConversation"("projectId");

-- CreateIndex
CREATE INDEX "idx_ai_conversations_task_id" ON "AIConversation"("taskId");

-- CreateIndex
CREATE INDEX "idx_ai_conversations_created_by" ON "AIConversation"("createdBy");

-- CreateIndex
CREATE INDEX "idx_ai_messages_conversation_id_created_at" ON "AIMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIWorkflowDefinition_key_key" ON "AIWorkflowDefinition"("key");

-- CreateIndex
CREATE INDEX "idx_ai_workflow_definitions_key" ON "AIWorkflowDefinition"("key");

-- CreateIndex
CREATE INDEX "idx_ai_workflow_runs_workflow_id" ON "AIWorkflowRun"("workflowId");

-- CreateIndex
CREATE INDEX "idx_ai_workflow_runs_project_id" ON "AIWorkflowRun"("projectId");

-- CreateIndex
CREATE INDEX "idx_ai_workflow_runs_task_id" ON "AIWorkflowRun"("taskId");

-- CreateIndex
CREATE INDEX "idx_ai_workflow_runs_status" ON "AIWorkflowRun"("status");

-- CreateIndex
CREATE INDEX "idx_ai_usage_logs_user_id" ON "AIUsageLog"("userId");

-- CreateIndex
CREATE INDEX "idx_ai_usage_logs_project_id" ON "AIUsageLog"("projectId");

-- CreateIndex
CREATE INDEX "idx_ai_usage_logs_model_name_created_at" ON "AIUsageLog"("modelName", "createdAt");
