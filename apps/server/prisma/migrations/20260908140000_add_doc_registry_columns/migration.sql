-- DocRegistry 增量（契约与文档知识层 v2 纪要切片 2 首步）：Document 治理字段 + 稳定寻址 + folder slug
-- AlterTable
ALTER TABLE "Document" ADD COLUMN "docRole" TEXT;
ALTER TABLE "Document" ADD COLUMN "provenance" TEXT NOT NULL DEFAULT 'authored';
ALTER TABLE "Document" ADD COLUMN "shortId" TEXT;
ALTER TABLE "Document" ADD COLUMN "sourceChecksum" TEXT;
ALTER TABLE "Document" ADD COLUMN "digestPolicy" TEXT NOT NULL DEFAULT 'on-demand';

-- CreateIndex
CREATE UNIQUE INDEX "Document_shortId_key" ON "Document"("shortId");

-- CreateIndex
CREATE INDEX "idx_documents_doc_role" ON "Document"("docRole");

-- AlterTable
ALTER TABLE "DocumentFolder" ADD COLUMN "slug" TEXT;
