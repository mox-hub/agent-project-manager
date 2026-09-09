-- spec 双版本（契约与文档知识层 v2 纪要 §10）：published 冻结快照指针
-- AlterTable（SQLite：ADD COLUMN 内联可空 REFERENCES）
ALTER TABLE "Document" ADD COLUMN "publishedVersionId" TEXT REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "Document_publishedVersionId_key" ON "Document"("publishedVersionId");
