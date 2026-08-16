-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Milestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "iterationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" DATETIME,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Milestone_iterationId_fkey" FOREIGN KEY ("iterationId") REFERENCES "Iteration" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Milestone" ("createdAt", "description", "id", "iterationId", "metadata", "name", "projectId", "status", "targetDate", "updatedAt") SELECT "createdAt", "description", "id", "iterationId", "metadata", "name", "projectId", "status", "targetDate", "updatedAt" FROM "Milestone";
DROP TABLE "Milestone";
ALTER TABLE "new_Milestone" RENAME TO "Milestone";
CREATE INDEX "idx_milestones_project_id" ON "Milestone"("projectId");
CREATE INDEX "idx_milestones_project_id_status" ON "Milestone"("projectId", "status");
CREATE INDEX "idx_milestones_iteration_id" ON "Milestone"("iterationId");
CREATE TABLE "new_MilestoneTask" (
    "milestoneId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "projectId" TEXT,
    "metadata" JSONB,

    PRIMARY KEY ("milestoneId", "taskId"),
    CONSTRAINT "MilestoneTask_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MilestoneTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MilestoneTask" ("metadata", "milestoneId", "projectId", "taskId") SELECT "metadata", "milestoneId", "projectId", "taskId" FROM "MilestoneTask";
DROP TABLE "MilestoneTask";
ALTER TABLE "new_MilestoneTask" RENAME TO "MilestoneTask";
CREATE INDEX "idx_milestone_tasks_task_id" ON "MilestoneTask"("taskId");
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
    "aiSuggestion" JSONB,
    "aiExecutionSpec" JSONB,
    "aiExecutionResult" JSONB,
    "aiExecutionStatus" TEXT,
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
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_iterationId_fkey" FOREIGN KEY ("iterationId") REFERENCES "Iteration" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("actualSpent", "aiAgentId", "aiExecutionResult", "aiExecutionSpec", "aiExecutionStatus", "aiSuggestion", "assigneeId", "assigneeType", "bugActualResult", "bugEnvironment", "bugExpectedResult", "bugReproducibility", "bugStepsToReproduce", "createdAt", "description", "dueDate", "estimate", "gitRefs", "id", "iterationId", "metadata", "milestoneId", "parentTaskId", "priority", "projectId", "reporterId", "severity", "shortId", "startDate", "status", "title", "todoItems", "type", "updatedAt") SELECT "actualSpent", "aiAgentId", "aiExecutionResult", "aiExecutionSpec", "aiExecutionStatus", "aiSuggestion", "assigneeId", "assigneeType", "bugActualResult", "bugEnvironment", "bugExpectedResult", "bugReproducibility", "bugStepsToReproduce", "createdAt", "description", "dueDate", "estimate", "gitRefs", "id", "iterationId", "metadata", "milestoneId", "parentTaskId", "priority", "projectId", "reporterId", "severity", "shortId", "startDate", "status", "title", "todoItems", "type", "updatedAt" FROM "Task";
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
CREATE TABLE "new_TaskActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "taskId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT,
    "detail" JSONB,
    "source" TEXT,
    "metadata" JSONB,
    CONSTRAINT "TaskActivity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TaskActivity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TaskActivity" ("actorId", "detail", "id", "metadata", "projectId", "source", "summary", "taskId", "timestamp", "type") SELECT "actorId", "detail", "id", "metadata", "projectId", "source", "summary", "taskId", "timestamp", "type" FROM "TaskActivity";
DROP TABLE "TaskActivity";
ALTER TABLE "new_TaskActivity" RENAME TO "TaskActivity";
CREATE INDEX "idx_task_activities_task_id_timestamp" ON "TaskActivity"("taskId", "timestamp");
CREATE INDEX "idx_task_activities_project_id" ON "TaskActivity"("projectId");
CREATE INDEX "idx_task_activities_actor_id" ON "TaskActivity"("actorId");
CREATE TABLE "new_TaskDependency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "taskId" TEXT NOT NULL,
    "dependsOnTaskId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskDependency_dependsOnTaskId_fkey" FOREIGN KEY ("dependsOnTaskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TaskDependency" ("createdAt", "dependsOnTaskId", "id", "projectId", "taskId", "type") SELECT "createdAt", "dependsOnTaskId", "id", "projectId", "taskId", "type" FROM "TaskDependency";
DROP TABLE "TaskDependency";
ALTER TABLE "new_TaskDependency" RENAME TO "TaskDependency";
CREATE INDEX "idx_task_dependencies_task_id" ON "TaskDependency"("taskId");
CREATE INDEX "idx_task_dependencies_depends_on_task_id" ON "TaskDependency"("dependsOnTaskId");
CREATE UNIQUE INDEX "TaskDependency_taskId_dependsOnTaskId_key" ON "TaskDependency"("taskId", "dependsOnTaskId");
CREATE TABLE "new_TaskTag" (
    "taskId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "projectId" TEXT,

    PRIMARY KEY ("taskId", "tagId"),
    CONSTRAINT "TaskTag_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TaskTag" ("projectId", "tagId", "taskId") SELECT "projectId", "tagId", "taskId" FROM "TaskTag";
DROP TABLE "TaskTag";
ALTER TABLE "new_TaskTag" RENAME TO "TaskTag";
CREATE INDEX "idx_task_tags_tag_id" ON "TaskTag"("tagId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
