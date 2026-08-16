-- Reset apiKeyEnc to nullable so we can clear API keys on the provider
-- SQLite doesn't support ALTER COLUMN DROP NOT NULL directly, so we use table rebuild

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_AIProviderConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "sdkType" TEXT NOT NULL,
    "apiKeyEnc" TEXT,
    "baseUrl" TEXT,
    "organizationId" TEXT,
    "metadata" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "lastValidatedAt" DATETIME,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_AIProviderConfig" (
    "id", "provider", "displayName", "sdkType", "apiKeyEnc", "baseUrl",
    "organizationId", "metadata", "enabled", "status", "lastValidatedAt",
    "errorMessage", "createdAt", "updatedAt"
)
SELECT
    "id", "provider", "displayName", "sdkType", "apiKeyEnc", "baseUrl",
    "organizationId", "metadata", "enabled", "status", "lastValidatedAt",
    "errorMessage", "createdAt", "updatedAt"
FROM "AIProviderConfig";

DROP TABLE "AIProviderConfig";

ALTER TABLE "new_AIProviderConfig" RENAME TO "AIProviderConfig";

-- Recreate indexes
CREATE UNIQUE INDEX "AIProviderConfig_provider_key" ON "AIProviderConfig"("provider");
CREATE INDEX "idx_ai_provider_configs_enabled" ON "AIProviderConfig"("enabled");
CREATE INDEX "idx_ai_provider_configs_status" ON "AIProviderConfig"("status");

PRAGMA foreign_keys=ON;