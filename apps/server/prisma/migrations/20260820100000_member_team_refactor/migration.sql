-- 成员/团队重构：Member 增列（shortId/title/description/trustLevel/trustScore/personalPrompt/thinkingLevel/tags/costRatePerDay）
-- shortId 需 NOT NULL + 唯一，SQLite 须整表重建；顺带把 metadata 与 AppConfig(trust.profile.*) 中的数据回填到字段化列

ALTER TABLE "Member" RENAME TO "_Member_refactor_old";

CREATE TABLE "Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "email" TEXT,
    "handle" TEXT,
    "shortId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "title" TEXT,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'human',
    "status" TEXT NOT NULL DEFAULT 'active',
    "trustLevel" INTEGER,
    "trustScore" INTEGER,
    "tags" JSONB,
    "personalPrompt" TEXT,
    "thinkingLevel" TEXT,
    "costRatePerDay" INTEGER,
    "aiModelConfigId" TEXT,
    "defaultCliProviderId" TEXT,
    "defaultExecutionRole" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "Member" (
    "id","userId","email","handle","shortId","displayName","avatarUrl","title","description",
    "type","status","trustLevel","trustScore","tags","personalPrompt","thinkingLevel","costRatePerDay",
    "aiModelConfigId","defaultCliProviderId","defaultExecutionRole","metadata","createdAt","updatedAt"
)
SELECT
    "id","userId","email","handle",
    lower(substr(hex(randomblob(4)), 1, 8)),
    "displayName","avatarUrl",
    json_extract("metadata", '$.title'),
    json_extract("metadata", '$.bio'),
    "type","status",
    (SELECT json_extract(a."value", '$.trustLevel') FROM "AppConfig" a WHERE a."key" = 'trust.profile.' || o."id"),
    (SELECT json_extract(a."value", '$.trustScore') FROM "AppConfig" a WHERE a."key" = 'trust.profile.' || o."id"),
    json_extract("metadata", '$.tags'),
    json_extract("metadata", '$.systemPrompt'),
    NULL,
    NULL,
    "aiModelConfigId","defaultCliProviderId","defaultExecutionRole","metadata","createdAt","updatedAt"
FROM "_Member_refactor_old" o;

DROP TABLE "_Member_refactor_old";

-- 重建随旧表删除的索引，并新增 shortId 唯一索引
CREATE UNIQUE INDEX "Member_userId_key" ON "Member"("userId");
CREATE UNIQUE INDEX "Member_handle_key" ON "Member"("handle");
CREATE UNIQUE INDEX "Member_shortId_key" ON "Member"("shortId");
CREATE INDEX "idx_members_user_id" ON "Member"("userId");
CREATE INDEX "idx_members_status" ON "Member"("status");
CREATE INDEX "idx_members_type" ON "Member"("type");
CREATE INDEX "idx_members_ai_model_config_id" ON "Member"("aiModelConfigId");
CREATE INDEX "idx_members_default_cli_provider" ON "Member"("defaultCliProviderId");

-- Team 增列：团队提示词与标签
ALTER TABLE "Team" ADD COLUMN "teamPrompt" TEXT;
ALTER TABLE "Team" ADD COLUMN "tags" JSONB;

-- CreateTable: MemberToolGrant（AI 成员工具/MCP/技能白名单）
CREATE TABLE "MemberToolGrant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "refKey" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "grantedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "uniq_member_tool_grants_member_scope_ref" ON "MemberToolGrant"("memberId", "scope", "refKey");
CREATE INDEX "idx_member_tool_grants_member_id" ON "MemberToolGrant"("memberId");

-- CreateTable: MailOutbox（Outbox 模式邮件发件箱）
CREATE TABLE "MailOutbox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "template" TEXT,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" DATETIME,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_mail_outbox_status" ON "MailOutbox"("status");
CREATE INDEX "idx_mail_outbox_to" ON "MailOutbox"("to");
