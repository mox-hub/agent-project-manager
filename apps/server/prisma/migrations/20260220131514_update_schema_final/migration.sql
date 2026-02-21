-- CreateTable
CREATE TABLE "Plugin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "provider" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "projectId" TEXT,
    "manifest" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Plugin_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PluginPermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pluginId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PluginPermission_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIWorkflowStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "stepType" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "AIWorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AIWorkflowDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_NotificationPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "eventType" TEXT NOT NULL,
    "channels" JSONB NOT NULL,
    "digestFrequency" TEXT,
    "quietHours" JSONB,
    "enabled" BOOLEAN NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_NotificationPreference" ("channels", "createdAt", "digestFrequency", "enabled", "eventType", "id", "metadata", "projectId", "quietHours", "updatedAt", "userId") SELECT "channels", "createdAt", "digestFrequency", "enabled", "eventType", "id", "metadata", "projectId", "quietHours", "updatedAt", "userId" FROM "NotificationPreference";
DROP TABLE "NotificationPreference";
ALTER TABLE "new_NotificationPreference" RENAME TO "NotificationPreference";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "idx_plugins_name" ON "Plugin"("name");

-- CreateIndex
CREATE INDEX "idx_plugins_enabled" ON "Plugin"("enabled");

-- CreateIndex
CREATE INDEX "idx_plugins_provider" ON "Plugin"("provider");

-- CreateIndex
CREATE INDEX "idx_plugins_project_id" ON "Plugin"("projectId");

-- CreateIndex
CREATE INDEX "idx_plugin_permissions_plugin_id_permission" ON "PluginPermission"("pluginId", "permission");

-- CreateIndex
CREATE INDEX "idx_ai_workflow_steps_workflow_id_order" ON "AIWorkflowStep"("workflowId", "order");
