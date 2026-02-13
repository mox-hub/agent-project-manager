-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "scope" TEXT NOT NULL,
    "projectId" TEXT,
    "userId" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "projectId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SystemEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "authProvider" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "timezone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoleAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "projectId" TEXT,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OAuth2Provider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "authUrl" TEXT NOT NULL,
    "tokenUrl" TEXT NOT NULL,
    "userinfoUrl" TEXT,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "redirectUris" JSONB,
    "scopes" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OAuth2Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "externalUsername" TEXT,
    "email" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" DATETIME,
    "scopes" JSONB,
    "rawProfile" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OAuth2Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OAuth2Account_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "OAuth2Provider" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "resourceTypes" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "metadata" JSONB
);

-- CreateTable
CREATE TABLE "StatusDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "type" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "isBlockedState" BOOLEAN NOT NULL DEFAULT false,
    "allowedNextStatusKeys" JSONB,
    "metadata" JSONB
);

-- CreateTable
CREATE TABLE "ProjectRoleDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultAssigneeIds" JSONB,
    "metadata" JSONB
);

-- CreateTable
CREATE TABLE "ProjectTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseProjectType" TEXT,
    "defaultTags" JSONB,
    "defaultStatuses" JSONB,
    "defaultIterations" JSONB,
    "defaultTasks" JSONB,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "metadata" JSONB
);

-- CreateIndex
CREATE INDEX "idx_app_configs_key_scope" ON "AppConfig"("key", "scope");

-- CreateIndex
CREATE INDEX "idx_app_configs_project_id" ON "AppConfig"("projectId");

-- CreateIndex
CREATE INDEX "idx_app_configs_user_id" ON "AppConfig"("userId");

-- CreateIndex
CREATE INDEX "idx_audit_logs_actor_id_created_at" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_audit_logs_project_id" ON "AuditLog"("projectId");

-- CreateIndex
CREATE INDEX "idx_audit_logs_resource" ON "AuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "idx_system_events_level_created_at" ON "SystemEvent"("level", "createdAt");

-- CreateIndex
CREATE INDEX "idx_system_events_category_created_at" ON "SystemEvent"("category", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "idx_sessions_user_id" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "idx_sessions_expires_at" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "idx_role_assignments_user_scope" ON "RoleAssignment"("userId", "scopeType", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleAssignment_userId_scopeType_projectId_role_key" ON "RoleAssignment"("userId", "scopeType", "projectId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "OAuth2Provider_name_key" ON "OAuth2Provider"("name");

-- CreateIndex
CREATE INDEX "idx_oauth2_accounts_user_id" ON "OAuth2Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuth2Account_providerId_externalUserId_key" ON "OAuth2Account"("providerId", "externalUserId");

-- CreateIndex
CREATE INDEX "idx_tags_project_id" ON "Tag"("projectId");

-- CreateIndex
CREATE INDEX "idx_tags_name_project" ON "Tag"("name", "projectId");

-- CreateIndex
CREATE INDEX "idx_status_def_project_type" ON "StatusDefinition"("projectId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "StatusDefinition_projectId_type_key_key" ON "StatusDefinition"("projectId", "type", "key");

-- CreateIndex
CREATE INDEX "idx_project_roles_project_id" ON "ProjectRoleDefinition"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectRoleDefinition_projectId_key_key" ON "ProjectRoleDefinition"("projectId", "key");

-- CreateIndex
CREATE INDEX "idx_project_templates_name" ON "ProjectTemplate"("name");
