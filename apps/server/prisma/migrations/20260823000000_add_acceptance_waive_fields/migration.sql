-- Acceptance 豁免记录字段（跳过接收直接放行：操作人/时间/原因）
ALTER TABLE "Acceptance" ADD COLUMN "waivedAt" DATETIME;
ALTER TABLE "Acceptance" ADD COLUMN "waivedBy" TEXT;
ALTER TABLE "Acceptance" ADD COLUMN "waiverReason" TEXT;
