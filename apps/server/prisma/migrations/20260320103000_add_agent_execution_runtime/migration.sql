-- CreateTable
CREATE TABLE "AgentIdentity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ai_employee',
    "status" TEXT NOT NULL DEFAULT 'active',
    "description" TEXT,
    "systemPrompt" TEXT,
    "toolPolicy" JSONB,
    "metadata" JSONB,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentIdentity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExecutionRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "taskId" TEXT,
    "agentId" TEXT,
    "requestedBy" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'ai_employee',
    "goal" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "input" JSONB,
    "contextPack" JSONB,
    "plan" JSONB,
    "output" JSONB,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExecutionRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExecutionRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExecutionRun_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentIdentity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionRunId" TEXT NOT NULL,
    "projectId" TEXT,
    "taskId" TEXT,
    "actionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedBy" TEXT,
    "decidedBy" TEXT,
    "reason" TEXT,
    "requestPayload" JSONB,
    "decisionPayload" JSONB,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApprovalRequest_executionRunId_fkey" FOREIGN KEY ("executionRunId") REFERENCES "ExecutionRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApprovalRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ApprovalRequest_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "idx_agent_identities_project_id" ON "AgentIdentity"("projectId");

-- CreateIndex
CREATE INDEX "idx_agent_identities_type" ON "AgentIdentity"("type");

-- CreateIndex
CREATE INDEX "idx_agent_identities_status" ON "AgentIdentity"("status");

-- CreateIndex
CREATE INDEX "idx_execution_runs_project_id" ON "ExecutionRun"("projectId");

-- CreateIndex
CREATE INDEX "idx_execution_runs_task_id" ON "ExecutionRun"("taskId");

-- CreateIndex
CREATE INDEX "idx_execution_runs_agent_id" ON "ExecutionRun"("agentId");

-- CreateIndex
CREATE INDEX "idx_execution_runs_status" ON "ExecutionRun"("status");

-- CreateIndex
CREATE INDEX "idx_approval_requests_execution_run_id" ON "ApprovalRequest"("executionRunId");

-- CreateIndex
CREATE INDEX "idx_approval_requests_project_id" ON "ApprovalRequest"("projectId");

-- CreateIndex
CREATE INDEX "idx_approval_requests_task_id" ON "ApprovalRequest"("taskId");

-- CreateIndex
CREATE INDEX "idx_approval_requests_status" ON "ApprovalRequest"("status");
