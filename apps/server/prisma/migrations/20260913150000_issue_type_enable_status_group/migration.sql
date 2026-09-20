-- IssueType：描述与启用开关（类型管理面重设计）；StatusDefinition：状态分组列
ALTER TABLE "IssueType" ADD COLUMN "description" TEXT;
ALTER TABLE "IssueType" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "StatusDefinition" ADD COLUMN "group" TEXT NOT NULL DEFAULT 'unstarted';
