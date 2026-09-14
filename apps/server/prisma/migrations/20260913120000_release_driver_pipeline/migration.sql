-- CAP-K-03 驱动型发版：Release 状态机扩展 + 发布执行元数据
-- 状态机：draft | gated | approved | publishing | released | failed（兼容存量 draft/released）
-- 注意：SQLite 下 Json 列须声明 JSONB（对齐 20260811 先例）——"JSON" 会落
-- NUMERIC affinity，Prisma RETURNING 读回即 "Value JSON not supported"。

ALTER TABLE "Release" ADD COLUMN "scope" JSONB;
ALTER TABLE "Release" ADD COLUMN "gateResult" JSONB;
ALTER TABLE "Release" ADD COLUMN "executionLog" JSONB;
ALTER TABLE "Release" ADD COLUMN "failureReason" TEXT;
ALTER TABLE "Release" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "Release" ADD COLUMN "approvedAt" DATETIME;
ALTER TABLE "Release" ADD COLUMN "tagPushed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Release" ADD COLUMN "githubReleased" BOOLEAN NOT NULL DEFAULT false;
