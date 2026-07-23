-- AlterTable
ALTER TABLE "ExecutionRun" ADD COLUMN "costBreakdown" JSONB;
ALTER TABLE "ExecutionRun" ADD COLUMN "totalCost" REAL;
ALTER TABLE "ExecutionRun" ADD COLUMN "totalTokens" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AIUsageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "projectId" TEXT,
    "taskId" TEXT,
    "conversationId" TEXT,
    "workflowRunId" TEXT,
    "executionRunId" TEXT,
    "executionStepId" TEXT,
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
    CONSTRAINT "AIUsageLog_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "AIWorkflowRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AIUsageLog_executionRunId_fkey" FOREIGN KEY ("executionRunId") REFERENCES "ExecutionRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AIUsageLog_executionStepId_fkey" FOREIGN KEY ("executionStepId") REFERENCES "ExecutionStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AIUsageLog" ("completionTokens", "conversationId", "createdAt", "estimatedCost", "id", "modelName", "projectId", "promptTokens", "provider", "requestPayload", "responseMetadata", "taskId", "totalTokens", "userId", "workflowRunId") SELECT "completionTokens", "conversationId", "createdAt", "estimatedCost", "id", "modelName", "projectId", "promptTokens", "provider", "requestPayload", "responseMetadata", "taskId", "totalTokens", "userId", "workflowRunId" FROM "AIUsageLog";
DROP TABLE "AIUsageLog";
ALTER TABLE "new_AIUsageLog" RENAME TO "AIUsageLog";
CREATE INDEX "idx_ai_usage_logs_user_id" ON "AIUsageLog"("userId");
CREATE INDEX "idx_ai_usage_logs_project_id" ON "AIUsageLog"("projectId");
CREATE INDEX "idx_ai_usage_logs_model_name_created_at" ON "AIUsageLog"("modelName", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
