-- 契约文件绑定（契约与文档知识层 v2 纪要 §6.2）：车道 A 仓库契约文件与平台的三态绑定账本
-- CreateTable
CREATE TABLE "ContractFileBinding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "syncMode" TEXT NOT NULL DEFAULT 'managed',
    "managedBlocks" JSONB,
    "truthOwner" TEXT NOT NULL DEFAULT 'file_git',
    "baseline" TEXT,
    "conflictState" TEXT,
    "lastWriter" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContractFileBinding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractFileBinding_projectId_fileType_key" ON "ContractFileBinding"("projectId", "fileType");

-- CreateIndex
CREATE INDEX "idx_contract_bindings_project_id" ON "ContractFileBinding"("projectId");
