-- AlterTable
ALTER TABLE "Project" ADD COLUMN "projectCode" TEXT;
ALTER TABLE "Project" ADD COLUMN "icon" TEXT;
ALTER TABLE "Project" ADD COLUMN "color" TEXT DEFAULT '#5E6AD2';
ALTER TABLE "Project" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "Project" ADD COLUMN "workflowStatus" TEXT NOT NULL DEFAULT 'planned';
ALTER TABLE "Project" ADD COLUMN "healthStatus" TEXT NOT NULL DEFAULT 'at_risk';
ALTER TABLE "Project" ADD COLUMN "riskLevel" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "Project" ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Project" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "Project" ADD COLUMN "startDate" DATETIME;
ALTER TABLE "Project" ADD COLUMN "targetDate" DATETIME;
ALTER TABLE "Project" ADD COLUMN "completedAt" DATETIME;
ALTER TABLE "Project" ADD COLUMN "category" TEXT;
ALTER TABLE "Project" ADD COLUMN "estimatePoints" INTEGER;
ALTER TABLE "Project" ADD COLUMN "lastActivityAt" DATETIME;
ALTER TABLE "Project" ADD COLUMN "blockedReason" TEXT;

-- Backfill
UPDATE "Project"
SET
  "healthStatus" = CASE
    WHEN "healthScore" >= 80 THEN 'on_track'
    WHEN "healthScore" >= 50 THEN 'at_risk'
    ELSE 'off_track'
  END,
  "lastActivityAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP);

UPDATE "Project"
SET "ownerId" = (
  SELECT pm."userId"
  FROM "ProjectMember" pm
  WHERE pm."projectId" = "Project"."id" AND pm."role" = 'owner'
  LIMIT 1
)
WHERE "ownerId" IS NULL;

-- Indexes
CREATE UNIQUE INDEX "Project_projectCode_key" ON "Project"("projectCode");
CREATE INDEX "idx_projects_priority" ON "Project"("priority");
CREATE INDEX "idx_projects_workflow_status" ON "Project"("workflowStatus");
CREATE INDEX "idx_projects_risk_level" ON "Project"("riskLevel");
CREATE INDEX "idx_projects_owner_id" ON "Project"("ownerId");
CREATE INDEX "idx_projects_target_date" ON "Project"("targetDate");
CREATE INDEX "idx_projects_last_activity_at" ON "Project"("lastActivityAt");
