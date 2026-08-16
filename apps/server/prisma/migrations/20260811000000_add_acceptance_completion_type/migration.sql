-- V3 阶段1：完成契约类型 + 接收驳回证据
ALTER TABLE "Acceptance" ADD COLUMN "completionType" TEXT NOT NULL DEFAULT 'artifact';
ALTER TABLE "Acceptance" ADD COLUMN "completionEvidence" JSONB;
ALTER TABLE "Acceptance" ADD COLUMN "completedBy" TEXT;
ALTER TABLE "Acceptance" ADD COLUMN "rejectedAt" DATETIME;
ALTER TABLE "Acceptance" ADD COLUMN "rejectionReason" TEXT;
