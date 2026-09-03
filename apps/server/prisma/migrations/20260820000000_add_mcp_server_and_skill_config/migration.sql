-- Add McpServerConfig table (外部 MCP server 接入：stdio/http/sse 配置 + 探活缓存)
CREATE TABLE "McpServerConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "transport" TEXT NOT NULL DEFAULT 'stdio',
    "command" TEXT,
    "args" JSONB,
    "env" JSONB,
    "url" TEXT,
    "headers" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastStatus" TEXT,
    "lastError" TEXT,
    "toolCount" INTEGER,
    "lastLatencyMs" INTEGER,
    "lastPingAt" DATETIME,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "McpServerConfig_name_key" ON "McpServerConfig"("name");
CREATE INDEX "idx_mcp_server_config_enabled" ON "McpServerConfig"("enabled");
CREATE INDEX "idx_mcp_server_config_transport" ON "McpServerConfig"("transport");

-- Add SkillConfig table (AI 技能注册表)
CREATE TABLE "SkillConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Development',
    "source" TEXT NOT NULL DEFAULT 'builtin',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "SkillConfig_key_key" ON "SkillConfig"("key");
CREATE INDEX "idx_skill_config_category" ON "SkillConfig"("category");
CREATE INDEX "idx_skill_config_enabled" ON "SkillConfig"("enabled");
