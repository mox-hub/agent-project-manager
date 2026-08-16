-- CreateTable
CREATE TABLE "Acceptance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "type" TEXT NOT NULL DEFAULT 'mixed',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "title" TEXT,
    "description" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "totalCost" REAL,
    "totalTokens" INTEGER,
    "metadata" JSONB,
    CONSTRAINT "Acceptance_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AcceptanceCriteria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "acceptanceId" TEXT NOT NULL,
    "criteriaType" TEXT NOT NULL,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "weight" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "order" INTEGER NOT NULL DEFAULT 0,
    "passedAt" DATETIME,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AcceptanceCriteria_acceptanceId_fkey" FOREIGN KEY ("acceptanceId") REFERENCES "Acceptance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AcceptanceEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "criteriaId" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "content" TEXT,
    "storageRef" TEXT,
    "submittedBy" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AcceptanceEvidence_criteriaId_fkey" FOREIGN KEY ("criteriaId") REFERENCES "AcceptanceCriteria" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompletenessChecklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectType" TEXT NOT NULL,
    "techStack" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,
    "checklist" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CompletenessAuditReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "acceptanceId" TEXT NOT NULL,
    "checklistId" TEXT,
    "riskLevel" TEXT NOT NULL,
    "blockedItems" JSONB NOT NULL,
    "suggestedItems" JSONB NOT NULL,
    "passedItems" JSONB NOT NULL,
    "summary" TEXT,
    "auditDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompletenessAuditReport_acceptanceId_fkey" FOREIGN KEY ("acceptanceId") REFERENCES "Acceptance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CompletenessAuditReport_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "CompletenessChecklist" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ExecutionRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "identitySource" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "role" TEXT,
    "level" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "input" JSONB,
    "output" JSONB,
    "errorDetail" JSONB,
    "contextSnapshotId" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "terminatedAt" DATETIME,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "metadata" JSONB,
    "acceptanceId" TEXT,
    CONSTRAINT "ExecutionRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExecutionRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExecutionRun_acceptanceId_fkey" FOREIGN KEY ("acceptanceId") REFERENCES "Acceptance" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ExecutionRun" ("completedAt", "contextSnapshotId", "createdAt", "createdBy", "errorDetail", "goal", "id", "identitySource", "input", "level", "metadata", "output", "projectId", "role", "startedAt", "status", "subjectId", "subjectType", "taskId", "terminatedAt", "updatedAt") SELECT "completedAt", "contextSnapshotId", "createdAt", "createdBy", "errorDetail", "goal", "id", "identitySource", "input", "level", "metadata", "output", "projectId", "role", "startedAt", "status", "subjectId", "subjectType", "taskId", "terminatedAt", "updatedAt" FROM "ExecutionRun";
DROP TABLE "ExecutionRun";
ALTER TABLE "new_ExecutionRun" RENAME TO "ExecutionRun";
CREATE INDEX "idx_execution_runs_project_id" ON "ExecutionRun"("projectId");
CREATE INDEX "idx_execution_runs_task_id" ON "ExecutionRun"("taskId");
CREATE INDEX "idx_execution_runs_subject" ON "ExecutionRun"("subjectType", "subjectId");
CREATE INDEX "idx_execution_runs_status" ON "ExecutionRun"("status");
CREATE INDEX "idx_execution_runs_created_at" ON "ExecutionRun"("createdAt");
CREATE INDEX "idx_execution_runs_acceptance_id" ON "ExecutionRun"("acceptanceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "idx_acceptances_task_id" ON "Acceptance"("taskId");

-- CreateIndex
CREATE INDEX "idx_acceptances_status" ON "Acceptance"("status");

-- CreateIndex
CREATE INDEX "idx_acceptances_created_at" ON "Acceptance"("createdAt");

-- CreateIndex
CREATE INDEX "idx_acceptance_criteria_acceptance_id" ON "AcceptanceCriteria"("acceptanceId");

-- CreateIndex
CREATE INDEX "idx_acceptance_criteria_status" ON "AcceptanceCriteria"("status");

-- CreateIndex
CREATE INDEX "idx_acceptance_criteria_type" ON "AcceptanceCriteria"("criteriaType");

-- CreateIndex
CREATE INDEX "idx_acceptance_evidences_criteria_id" ON "AcceptanceEvidence"("criteriaId");

-- CreateIndex
CREATE INDEX "idx_acceptance_evidences_type" ON "AcceptanceEvidence"("evidenceType");

-- CreateIndex
CREATE INDEX "idx_checklists_project_tech" ON "CompletenessChecklist"("projectType", "techStack");

-- CreateIndex
CREATE INDEX "idx_checklists_is_system" ON "CompletenessChecklist"("isSystem");

-- CreateIndex
CREATE UNIQUE INDEX "CompletenessAuditReport_acceptanceId_key" ON "CompletenessAuditReport"("acceptanceId");

-- CreateIndex
CREATE INDEX "idx_audit_reports_risk_level" ON "CompletenessAuditReport"("riskLevel");

-- CreateIndex
CREATE INDEX "idx_audit_reports_date" ON "CompletenessAuditReport"("auditDate");
