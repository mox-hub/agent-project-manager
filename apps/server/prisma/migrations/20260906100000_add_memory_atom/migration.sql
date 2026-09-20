-- 记忆原子（Store B · AI 同事化）：应用侧长期记忆库，模型只读、代码可写
-- CreateTable
CREATE TABLE "MemoryAtom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 0.8,
    "refs" JSONB,
    "sourceEventId" TEXT,
    "sourceType" TEXT,
    "lifecycle" TEXT NOT NULL DEFAULT 'working',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" DATETIME,
    "supersededById" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "idx_memory_atoms_scope_type_lifecycle" ON "MemoryAtom"("scope", "type", "lifecycle");

-- CreateIndex
CREATE INDEX "idx_memory_atoms_scope_last_used" ON "MemoryAtom"("scope", "lastUsedAt");

-- CreateIndex
CREATE INDEX "idx_memory_atoms_source_event" ON "MemoryAtom"("sourceEventId");
