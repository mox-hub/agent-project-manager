-- Add CliProviderConfig table
-- 本地 CLI Provider 配置（覆盖内置 adapter 默认值）
--
-- v1 (initial deploy) used table-level @@unique([providerId]).
-- v2 (this file): switch to column-level @unique on providerId so that
-- Prisma client APIs (findUnique / upsert with where: { providerId }) compile.
CREATE TABLE "CliProviderConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "displayName" TEXT,
    "commandPath" TEXT,
    "model" TEXT,
    "env" JSONB,
    "allowedTools" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT,
    "lastDetectedAt" DATETIME,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Drop the old table-level unique index (if it was created by the previous deploy)
DROP INDEX IF EXISTS "uniq_cli_provider_config_provider";

-- Column-level unique constraint (matches @unique annotation in schema.prisma)
CREATE UNIQUE INDEX "CliProviderConfig_providerId_key" ON "CliProviderConfig"("providerId");
CREATE INDEX "idx_cli_provider_config_provider_id" ON "CliProviderConfig"("providerId");
CREATE INDEX "idx_cli_provider_config_enabled" ON "CliProviderConfig"("enabled");
