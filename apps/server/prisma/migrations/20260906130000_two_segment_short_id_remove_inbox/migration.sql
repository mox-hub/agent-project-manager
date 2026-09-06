-- 两段式全局 ShortID + INBOX 去实体化
-- 1) 新增全局序列表（两段式 shortId 的序号源）
CREATE TABLE "GlobalSequence" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- 2) 存量三段式 shortId 统一回填为 {前缀}-{全局序号}（按创建时间全系统统一编号，无补零）。
--    前缀读 AppConfig(task.shortIdPrefix, scope=global)，Prisma Json 落库为带引号文本，剥掉引号；未配置回落 APM。
--    新旧格式天然不重合（三段→两段），逐行更新不会触发 unique 瞬时冲突。
UPDATE "Task"
SET "shortId" = (
    SELECT REPLACE(REPLACE(COALESCE(
        (SELECT "value" FROM "AppConfig" WHERE "key" = 'task.shortIdPrefix' AND "scope" = 'global' LIMIT 1),
        'APM'
    ), '"', ''), '''', '')
        || '-' || (
        SELECT COUNT(*) + 1 FROM "Task" t2
        WHERE t2."createdAt" < "Task"."createdAt"
           OR (t2."createdAt" = "Task"."createdAt" AND t2."id" < "Task"."id")
    )
);

-- 3) 全局序列对齐存量任务总数，新号从 N+1 继续
INSERT INTO "GlobalSequence" ("key", "lastSeq", "updatedAt")
SELECT 'task.shortId', COUNT(*), CURRENT_TIMESTAMP FROM "Task";

-- 4) INBOX 去实体化：占位项目降级为「无项目」（projectId = NULL），删除占位实体
UPDATE "Task" SET "projectId" = NULL WHERE "projectId" = 'project-inbox';
DELETE FROM "ProjectMember" WHERE "projectId" = 'project-inbox';
DELETE FROM "ProjectModule" WHERE "projectId" = 'project-inbox';
DELETE FROM "ProjectSequence" WHERE "projectId" = 'project-inbox';
DELETE FROM "Project" WHERE "id" = 'project-inbox';

-- 5) 按项目序列的 ProjectSequence 下线（两段式全局序号不再需要）
DROP TABLE "ProjectSequence";
