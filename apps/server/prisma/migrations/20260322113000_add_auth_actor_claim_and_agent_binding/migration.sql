CREATE TABLE "AgentIdentityBinding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "identitySource" TEXT NOT NULL,
    "mappedRole" TEXT,
    "mappedLevel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "metadata" JSON,
    CONSTRAINT "AgentIdentityBinding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentIdentityBinding_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ActorClaimSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "identitySource" TEXT NOT NULL,
    "projectScopes" JSON,
    "permissionProfile" JSON,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "issuedBy" TEXT,
    "metadata" JSON,
    CONSTRAINT "ActorClaimSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uniq_agent_identity_project_subject" ON "AgentIdentityBinding"("projectId", "subjectType", "subjectId");
CREATE INDEX "idx_agent_identity_project_id" ON "AgentIdentityBinding"("projectId");
CREATE INDEX "idx_agent_identity_provider_id" ON "AgentIdentityBinding"("providerId");
CREATE INDEX "idx_agent_identity_status" ON "AgentIdentityBinding"("status");
CREATE INDEX "idx_actor_claim_subject" ON "ActorClaimSnapshot"("subjectType", "subjectId");
CREATE INDEX "idx_actor_claim_project_id" ON "ActorClaimSnapshot"("projectId");
CREATE INDEX "idx_actor_claim_expires_at" ON "ActorClaimSnapshot"("expiresAt");