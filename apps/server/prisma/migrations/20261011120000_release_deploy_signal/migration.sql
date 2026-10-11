-- Release 部署信号（交付出口切片 2026-10-11）：发布≠部署，
-- released 后由人手动标记实际部署完成——交付链条的终点信号位。
ALTER TABLE "Release" ADD COLUMN "deployedAt" DATETIME;
ALTER TABLE "Release" ADD COLUMN "deployNote" TEXT;
