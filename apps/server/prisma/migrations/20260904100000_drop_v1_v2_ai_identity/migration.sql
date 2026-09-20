-- DropIndex
DROP INDEX "idx_agent_identities_status";

-- DropIndex
DROP INDEX "idx_agent_identities_type";

-- DropIndex
DROP INDEX "idx_agent_identities_project_id";

-- DropIndex
DROP INDEX "AgentIdentityBinding_projectId_subjectType_subjectId_key";

-- DropIndex
DROP INDEX "idx_agent_identity_status";

-- DropIndex
DROP INDEX "idx_agent_identity_provider_id";

-- DropIndex
DROP INDEX "idx_agent_identity_project_id";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AgentIdentity";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AgentIdentityBinding";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "projectId" TEXT,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "changes" JSONB,
    "source" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Activity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Activity" ("actorId", "changes", "content", "createdAt", "entityId", "entityType", "id", "metadata", "projectId", "source", "summary", "type") SELECT "actorId", "changes", "content", "createdAt", "entityId", "entityType", "id", "metadata", "projectId", "source", "summary", "type" FROM "Activity";
DROP TABLE "Activity";
ALTER TABLE "new_Activity" RENAME TO "Activity";
CREATE INDEX "idx_activities_entity_created" ON "Activity"("entityType", "entityId", "createdAt");
CREATE INDEX "idx_activities_project_created" ON "Activity"("projectId", "createdAt");
CREATE INDEX "idx_activities_actor" ON "Activity"("actorId");
CREATE TABLE "new_ActivityReaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityReaction_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivityReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ActivityReaction" ("activityId", "createdAt", "emoji", "id", "userId") SELECT "activityId", "createdAt", "emoji", "id", "userId" FROM "ActivityReaction";
DROP TABLE "ActivityReaction";
ALTER TABLE "new_ActivityReaction" RENAME TO "ActivityReaction";
CREATE INDEX "idx_activity_reactions_activity" ON "ActivityReaction"("activityId");
CREATE UNIQUE INDEX "ActivityReaction_activityId_userId_emoji_key" ON "ActivityReaction"("activityId", "userId", "emoji");
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "iterationId" TEXT,
    "parentTaskId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "assigneeId" TEXT,
    "assigneeType" TEXT NOT NULL DEFAULT 'user',
    "aiAgentId" TEXT,
    "reporterId" TEXT,
    "startDate" DATETIME,
    "dueDate" DATETIME,
    "estimate" INTEGER,
    "actualSpent" INTEGER,
    "gitRefs" JSONB,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'task',
    "shortId" TEXT,
    "severity" TEXT,
    "bugReproducibility" TEXT,
    "bugStepsToReproduce" TEXT,
    "bugEnvironment" TEXT,
    "bugExpectedResult" TEXT,
    "bugActualResult" TEXT,
    "todoItems" JSONB,
    "milestoneId" TEXT,
    "externalProvider" TEXT,
    "externalIssueId" TEXT,
    "externalIdentifier" TEXT,
    "externalUrl" TEXT,
    "syncStatus" TEXT,
    "lastExternalSyncAt" DATETIME,
    "externalVersion" TEXT,
    "localUpdatedAt" DATETIME,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_iterationId_fkey" FOREIGN KEY ("iterationId") REFERENCES "Iteration" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("actualSpent", "aiAgentId", "assigneeId", "assigneeType", "bugActualResult", "bugEnvironment", "bugExpectedResult", "bugReproducibility", "bugStepsToReproduce", "createdAt", "description", "dueDate", "estimate", "externalIdentifier", "externalIssueId", "externalProvider", "externalUrl", "externalVersion", "gitRefs", "id", "iterationId", "lastExternalSyncAt", "localUpdatedAt", "metadata", "milestoneId", "parentTaskId", "priority", "projectId", "reporterId", "severity", "shortId", "startDate", "status", "syncStatus", "title", "todoItems", "type", "updatedAt") SELECT "actualSpent", "aiAgentId", "assigneeId", "assigneeType", "bugActualResult", "bugEnvironment", "bugExpectedResult", "bugReproducibility", "bugStepsToReproduce", "createdAt", "description", "dueDate", "estimate", "externalIdentifier", "externalIssueId", "externalProvider", "externalUrl", "externalVersion", "gitRefs", "id", "iterationId", "lastExternalSyncAt", "localUpdatedAt", "metadata", "milestoneId", "parentTaskId", "priority", "projectId", "reporterId", "severity", "shortId", "startDate", "status", "syncStatus", "title", "todoItems", "type", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE UNIQUE INDEX "Task_shortId_key" ON "Task"("shortId");
CREATE INDEX "idx_tasks_project_id" ON "Task"("projectId");
CREATE INDEX "idx_tasks_project_id_status" ON "Task"("projectId", "status");
CREATE INDEX "idx_tasks_assignee_id_status" ON "Task"("assigneeId", "status");
CREATE INDEX "idx_tasks_iteration_id" ON "Task"("iterationId");
CREATE INDEX "idx_tasks_parent_task_id" ON "Task"("parentTaskId");
CREATE INDEX "idx_tasks_type" ON "Task"("type");
CREATE INDEX "idx_tasks_milestone_id" ON "Task"("milestoneId");
CREATE INDEX "idx_tasks_severity" ON "Task"("severity");
CREATE INDEX "idx_tasks_external_ref" ON "Task"("externalProvider", "externalIssueId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- RedefineIndex
DROP INDEX "idx_decision_proposals_task_id";
CREATE INDEX "DecisionProposal_taskId_idx" ON "DecisionProposal"("taskId");

-- RedefineIndex
DROP INDEX "idx_decision_proposals_kind_status";
CREATE INDEX "DecisionProposal_kind_status_idx" ON "DecisionProposal"("kind", "status");

-- RedefineIndex
DROP INDEX "idx_decision_proposals_project_id_status";
CREATE INDEX "DecisionProposal_projectId_status_idx" ON "DecisionProposal"("projectId", "status");

-- RedefineIndex
DROP INDEX "idx_decision_proposals_status";
CREATE INDEX "DecisionProposal_status_idx" ON "DecisionProposal"("status");

