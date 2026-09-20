-- 接口协作卡（AI 同事化 · 交接试点）：前后端 AI 工件化协作的状态机载体
-- CreateTable
CREATE TABLE "CollaborationCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requesterMemberId" TEXT NOT NULL,
    "providerMemberId" TEXT NOT NULL,
    "relatedTaskId" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "rounds" INTEGER NOT NULL DEFAULT 0,
    "events" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "idx_collaboration_cards_project_status" ON "CollaborationCard"("projectId", "status");

-- CreateIndex
CREATE INDEX "idx_collaboration_cards_provider" ON "CollaborationCard"("providerMemberId");

-- CreateIndex
CREATE INDEX "idx_collaboration_cards_requester" ON "CollaborationCard"("requesterMemberId");
