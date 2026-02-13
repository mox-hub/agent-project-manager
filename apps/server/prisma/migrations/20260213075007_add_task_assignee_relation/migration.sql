-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "iterationId" TEXT,
    "parentTaskId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "assigneeId" TEXT,
    "reporterId" TEXT,
    "dueDate" DATETIME,
    "estimate" INTEGER,
    "actualSpent" INTEGER,
    "aiSuggestion" JSONB,
    "gitRefs" JSONB,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_iterationId_fkey" FOREIGN KEY ("iterationId") REFERENCES "Iteration" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("actualSpent", "aiSuggestion", "assigneeId", "createdAt", "description", "dueDate", "estimate", "gitRefs", "id", "iterationId", "metadata", "parentTaskId", "priority", "projectId", "reporterId", "status", "title", "updatedAt") SELECT "actualSpent", "aiSuggestion", "assigneeId", "createdAt", "description", "dueDate", "estimate", "gitRefs", "id", "iterationId", "metadata", "parentTaskId", "priority", "projectId", "reporterId", "status", "title", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "idx_tasks_project_id" ON "Task"("projectId");
CREATE INDEX "idx_tasks_project_id_status" ON "Task"("projectId", "status");
CREATE INDEX "idx_tasks_assignee_id_status" ON "Task"("assigneeId", "status");
CREATE INDEX "idx_tasks_iteration_id" ON "Task"("iterationId");
CREATE INDEX "idx_tasks_parent_task_id" ON "Task"("parentTaskId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
