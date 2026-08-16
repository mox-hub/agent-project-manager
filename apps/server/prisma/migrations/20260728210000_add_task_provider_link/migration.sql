-- Add external provider sync fields to Project
ALTER TABLE "Project" ADD COLUMN "externalProvider" TEXT;
ALTER TABLE "Project" ADD COLUMN "externalProjectId" TEXT;
ALTER TABLE "Project" ADD COLUMN "syncStatus" TEXT;
ALTER TABLE "Project" ADD COLUMN "lastSyncAt" DATETIME;
ALTER TABLE "Project" ADD COLUMN "syncErrorMessage" TEXT;
ALTER TABLE "Project" ADD COLUMN "fieldsLockedExternally" BOOLEAN NOT NULL DEFAULT false;

-- Add external provider sync fields to Task
ALTER TABLE "Task" ADD COLUMN "externalProvider" TEXT;
ALTER TABLE "Task" ADD COLUMN "externalIssueId" TEXT;
ALTER TABLE "Task" ADD COLUMN "externalIdentifier" TEXT;
ALTER TABLE "Task" ADD COLUMN "externalUrl" TEXT;
ALTER TABLE "Task" ADD COLUMN "syncStatus" TEXT;
ALTER TABLE "Task" ADD COLUMN "lastExternalSyncAt" DATETIME;
ALTER TABLE "Task" ADD COLUMN "externalVersion" TEXT;
ALTER TABLE "Task" ADD COLUMN "localUpdatedAt" DATETIME;

-- Add TaskProviderLink table
CREATE TABLE "TaskProviderLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "integrationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "externalProvider" TEXT NOT NULL,
    "externalProjectId" TEXT NOT NULL,
    "externalWorkspaceId" TEXT,
    "externalTeamId" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "lastSyncAt" DATETIME,
    "lastSyncError" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaskProviderLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskProviderLink_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "IntegrationConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TaskProviderLink_integrationId_externalProjectId_key" ON "TaskProviderLink"("integrationId", "externalProjectId");
CREATE INDEX "idx_task_provider_links_project_id" ON "TaskProviderLink"("projectId");
CREATE INDEX "idx_task_provider_links_external" ON "TaskProviderLink"("externalProvider", "externalProjectId");

-- Add IntegrationSyncLog table
CREATE TABLE "IntegrationSyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "integrationId" TEXT NOT NULL,
    "projectId" TEXT,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "action" TEXT NOT NULL,
    "direction" TEXT,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "payload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_sync_logs_integration_time" ON "IntegrationSyncLog"("integrationId", "createdAt");
CREATE INDEX "idx_sync_logs_project_id" ON "IntegrationSyncLog"("projectId");
CREATE INDEX "idx_sync_logs_status" ON "IntegrationSyncLog"("status");

-- Add indexes for the new External refs on Project and Task
CREATE INDEX "idx_projects_external_ref" ON "Project"("externalProvider", "externalProjectId");
CREATE INDEX "idx_tasks_external_ref" ON "Task"("externalProvider", "externalIssueId");
