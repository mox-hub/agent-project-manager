-- CreateTable
CREATE TABLE "IntegrationConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "configJson" JSONB NOT NULL,
    "status" TEXT,
    "lastSyncAt" DATETIME,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT
);

-- CreateTable
CREATE TABLE "ExternalIssueLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "summary" TEXT,
    "status" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WebhookEventLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "projectId" TEXT,
    "taskId" TEXT,
    "channels" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "readAt" DATETIME,
    "payloadJson" JSONB,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "eventType" TEXT NOT NULL,
    "channels" JSONB NOT NULL,
    "digestFrequency" TEXT,
    "quietHours" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "idx_integration_configs_provider" ON "IntegrationConfig"("provider");

-- CreateIndex
CREATE INDEX "idx_integration_configs_project_id" ON "IntegrationConfig"("projectId");

-- CreateIndex
CREATE INDEX "idx_integration_configs_scope_provider" ON "IntegrationConfig"("scope", "provider");

-- CreateIndex
CREATE INDEX "idx_external_issue_links_project_id" ON "ExternalIssueLink"("projectId");

-- CreateIndex
CREATE INDEX "idx_external_issue_links_task_id" ON "ExternalIssueLink"("taskId");

-- CreateIndex
CREATE INDEX "idx_external_issue_links_provider" ON "ExternalIssueLink"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalIssueLink_provider_externalId_key" ON "ExternalIssueLink"("provider", "externalId");

-- CreateIndex
CREATE INDEX "idx_webhook_event_logs_provider_created_at" ON "WebhookEventLog"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "idx_webhook_event_logs_processed" ON "WebhookEventLog"("processed");

-- CreateIndex
CREATE INDEX "idx_notifications_user_id_status" ON "Notification"("userId", "status");

-- CreateIndex
CREATE INDEX "idx_notifications_user_id_created_at" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_notifications_project_id" ON "Notification"("projectId");

-- CreateIndex
CREATE INDEX "idx_notifications_task_id" ON "Notification"("taskId");

-- CreateIndex
CREATE INDEX "idx_notifications_type" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "idx_notification_preferences_user_id" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "idx_notification_preferences_project_id" ON "NotificationPreference"("projectId");

-- CreateIndex
CREATE INDEX "idx_notification_preferences_event_type" ON "NotificationPreference"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_projectId_eventType_key" ON "NotificationPreference"("userId", "projectId", "eventType");
