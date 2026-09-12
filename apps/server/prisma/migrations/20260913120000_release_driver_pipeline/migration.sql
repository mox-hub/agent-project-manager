-- CAP-K-03 驱动型发版：Release 状态机扩展 + 发布执行元数据
-- 状态机：draft | gated | approved | publishing | released | failed（兼容存量 draft/released）

ALTER TABLE "Release" ADD COLUMN "scope" JSON;
ALTER TABLE "Release" ADD COLUMN "gateResult" JSON;
ALTER TABLE "Release" ADD COLUMN "executionLog" JSON;
ALTER TABLE "Release" ADD COLUMN "failureReason" TEXT;
ALTER TABLE "Release" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "Release" ADD COLUMN "approvedAt" DATETIME;
ALTER TABLE "Release" ADD COLUMN "tagPushed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Release" ADD COLUMN "githubReleased" BOOLEAN NOT NULL DEFAULT false;
