-- 文档 AI 摘要物化（契约与文档知识层 v2 纪要 §11）：digest 永不装正文
-- CreateTable
CREATE TABLE "DocumentDigest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "keyPoints" JSONB,
    "anchors" JSONB,
    "sourceChecksum" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "failReason" TEXT,
    "model" TEXT,
    "createdBy" TEXT NOT NULL DEFAULT 'system:summarizer',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocumentDigest_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentDigest_documentId_key" ON "DocumentDigest"("documentId");

-- CreateIndex
CREATE INDEX "idx_document_digests_project_id" ON "DocumentDigest"("projectId");
