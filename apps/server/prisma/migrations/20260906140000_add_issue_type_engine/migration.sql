-- IssueType 类型系统一期：类型元数据表 + Task.typeId 事实源回填
CREATE TABLE "IssueType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Circle',
    "color" TEXT NOT NULL DEFAULT '#5E6AD2',
    "order" INTEGER NOT NULL DEFAULT 100,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "IssueType_key_key" ON "IssueType"("key");

-- 内置类型：task（不可删）与 bug（可删）
INSERT INTO "IssueType" ("id", "key", "name", "icon", "color", "order", "isSystem", "createdAt", "updatedAt") VALUES
  ('issuetype-task', 'task', '任务', 'CheckSquare', '#5E6AD2', 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('issuetype-bug', 'bug', '缺陷', 'Bug', '#EF4444', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "Task" ADD COLUMN "typeId" TEXT REFERENCES "IssueType"("id") ON DELETE SET NULL;
UPDATE "Task" SET "typeId" = CASE "type" WHEN 'bug' THEN 'issuetype-bug' ELSE 'issuetype-task' END;
CREATE INDEX "idx_tasks_type_id" ON "Task"("typeId");
