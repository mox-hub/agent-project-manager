-- 技能注册表管理面（CAP-B-05 / CAP-P-01 grill 依赖）：content 物化入 DB + sourcePath 留档
-- AlterTable
ALTER TABLE "SkillConfig" ADD COLUMN "content" TEXT;
-- AlterTable
ALTER TABLE "SkillConfig" ADD COLUMN "sourcePath" TEXT;
