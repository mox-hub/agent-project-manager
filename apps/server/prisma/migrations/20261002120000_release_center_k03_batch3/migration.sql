-- CAP-K-03 批三发版中心扩展：发版计划/发布平台/升级注意/热修血缘。
-- 外键约束不做 DB 级 ADD CONSTRAINT（SQLite 不支持），关联完整性由
-- Prisma schema 自关联声明（ReleaseHotfixLineage）+ 应用层校验
-- （hotfix 目标存在/同项目/已发布）维护，同 Execution.retryOfId 先例。
-- platforms 为 Json 数组列，须 JSONB（"JSON" 落 NUMERIC affinity 读回即炸）。

-- AlterTable
ALTER TABLE "Release" ADD COLUMN "plannedAt" DATETIME;
ALTER TABLE "Release" ADD COLUMN "platforms" JSONB;
ALTER TABLE "Release" ADD COLUMN "upgradeNotes" TEXT;
ALTER TABLE "Release" ADD COLUMN "hotfixOfId" TEXT;

-- CreateIndex
CREATE INDEX "idx_releases_hotfix_of_id" ON "Release"("hotfixOfId");
