-- 4d：Execution 执行项扩展——工时与排序（title/description 已在 4b 落列）
ALTER TABLE "Execution" ADD COLUMN "estimate" INTEGER;
ALTER TABLE "Execution" ADD COLUMN "actualSpent" INTEGER;
ALTER TABLE "Execution" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
