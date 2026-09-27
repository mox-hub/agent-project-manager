-- CAP-A-24 增强 A：提示词模板库 + 工单模板提示词字段
-- (migrate dev 因迁移历史漂移不可用，本迁移经 migrate diff 提取子集手工执行登记)

-- AlterTable
ALTER TABLE "IssueTemplateItem" ADD COLUMN "promptHint" TEXT;

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'workspace',
    "projectId" TEXT,
    "target" TEXT NOT NULL DEFAULT 'task',
    "body" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PromptTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "idx_prompt_templates_project_id" ON "PromptTemplate"("projectId");

-- CreateIndex
CREATE INDEX "idx_prompt_templates_target" ON "PromptTemplate"("target");
