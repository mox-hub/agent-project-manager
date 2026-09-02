-- 决策提案（建议类决策卡地基）：Plan/Assign/Resolution/Spend/Clarify 统一承载
CREATE TABLE "DecisionProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "projectId" TEXT,
    "taskId" TEXT,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "proposerType" TEXT NOT NULL DEFAULT 'ai_agent',
    "proposerId" TEXT,
    "resolution" JSONB,
    "resolvedBy" TEXT,
    "resolvedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "idx_decision_proposals_status" ON "DecisionProposal"("status");
CREATE INDEX "idx_decision_proposals_project_id_status" ON "DecisionProposal"("projectId", "status");
CREATE INDEX "idx_decision_proposals_kind_status" ON "DecisionProposal"("kind", "status");
CREATE INDEX "idx_decision_proposals_task_id" ON "DecisionProposal"("taskId");
