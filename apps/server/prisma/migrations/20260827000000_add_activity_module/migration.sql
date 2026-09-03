-- 通用动态追踪模块：跨实体操作记录 + 表情回应
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "projectId" TEXT,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "changes" TEXT,
    "source" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_activities_entity_created" ON "Activity"("entityType", "entityId", "createdAt");
CREATE INDEX "idx_activities_project_created" ON "Activity"("projectId", "createdAt");
CREATE INDEX "idx_activities_actor" ON "Activity"("actorId");

CREATE TABLE "ActivityReaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ActivityReaction_activityId_userId_emoji_key" ON "ActivityReaction"("activityId", "userId", "emoji");
CREATE INDEX "idx_activity_reactions_activity" ON "ActivityReaction"("activityId");

-- 存量任务动态迁移进新表（bug 亦是 task，统一 entityType='task'）
INSERT INTO "Activity" ("id", "entityType", "entityId", "projectId", "actorId", "type", "summary", "content", "changes", "source", "metadata", "createdAt")
SELECT "id", 'task', "taskId", "projectId", "actorId", "type", "summary", NULL, "detail", "source", "metadata", "timestamp"
FROM "TaskActivity";
