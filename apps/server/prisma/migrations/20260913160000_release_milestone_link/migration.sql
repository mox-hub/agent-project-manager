-- CAP-A-16 里程碑与发布：Release 挂可选里程碑（计划-交付轴整合）
-- Iteration=时间盒、Milestone=计划轴节点、Release=交付物；
-- 外键约束不做 DB 级 ADD CONSTRAINT（SQLite 不支持），关联完整性由
-- Prisma schema 声明 + 应用层校验（release.service 跨项目/存在性 400）维护。

-- AlterTable
ALTER TABLE "Release" ADD COLUMN "milestoneId" TEXT;

-- CreateIndex
CREATE INDEX "idx_releases_milestone_id" ON "Release"("milestoneId");
