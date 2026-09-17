-- CAP-B-01 验收标准版本化 + CAP-B-02 审计结论绑定标准版本：
-- AcceptanceCriteria.revision 实质修订计数（默认 1），content 被修订时 +1；
-- AcceptanceEvidence.criteriaRevision 创建时快照当时标准 revision（存量 null 按 1 处理）；
-- CompletenessAuditReport.criteriaRevisions 审计时各标准 revision 快照
-- （存量 null 按「无法判定、不标过期」处理）。

-- AlterTable
ALTER TABLE "AcceptanceCriteria" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "AcceptanceCriteria" ADD COLUMN "revisedAt" DATETIME;

-- AlterTable
ALTER TABLE "AcceptanceEvidence" ADD COLUMN "criteriaRevision" INTEGER;

-- AlterTable
ALTER TABLE "CompletenessAuditReport" ADD COLUMN "criteriaRevisions" JSONB;
