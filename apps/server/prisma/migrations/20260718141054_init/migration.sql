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
    "actorType" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "projectId" TEXT,
    "result" TEXT,
    "reason" TEXT,
    "traceId" TEXT,
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
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "color" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "slug" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TeamProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TeamInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "memberId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TaskWatcher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TaskAssignee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
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
    "metadata" JSONB,
    CONSTRAINT "AgentIdentityBinding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentIdentityBinding_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActorClaimSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "identitySource" TEXT NOT NULL,
    "projectScopes" JSONB,
    "permissionProfile" JSONB,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "issuedBy" TEXT,
    "metadata" JSONB,
    CONSTRAINT "ActorClaimSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
CREATE TABLE "DocumentTag" (
    "documentId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("documentId", "tagId"),
    CONSTRAINT "DocumentTag_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectCode" TEXT,
    "icon" TEXT,
    "color" TEXT DEFAULT '#5E6AD2',
    "type" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'local',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "workflowStatus" TEXT NOT NULL DEFAULT 'planned',
    "healthStatus" TEXT NOT NULL DEFAULT 'at_risk',
    "riskLevel" TEXT NOT NULL DEFAULT 'medium',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "ownerId" TEXT,
    "startDate" DATETIME,
    "targetDate" DATETIME,
    "completedAt" DATETIME,
    "category" TEXT,
    "estimatePoints" INTEGER,
    "lastActivityAt" DATETIME,
    "blockedReason" TEXT,
    "healthScore" INTEGER NOT NULL DEFAULT 50,
    "config" JSONB,
    "documentsRepoPath" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    PRIMARY KEY ("projectId", "userId"),
    CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Iteration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "capacity" INTEGER,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Iteration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "iterationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" DATETIME,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Milestone_iterationId_fkey" FOREIGN KEY ("iterationId") REFERENCES "Iteration" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MilestoneTask" (
    "milestoneId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "metadata" JSONB,

    PRIMARY KEY ("milestoneId", "taskId"),
    CONSTRAINT "MilestoneTask_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MilestoneTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "iterationId" TEXT,
    "parentTaskId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "assigneeId" TEXT,
    "assigneeType" TEXT NOT NULL DEFAULT 'user',
    "aiAgentId" TEXT,
    "reporterId" TEXT,
    "startDate" DATETIME,
    "dueDate" DATETIME,
    "estimate" INTEGER,
    "actualSpent" INTEGER,
    "aiSuggestion" JSONB,
    "aiExecutionSpec" JSONB,
    "aiExecutionResult" JSONB,
    "aiExecutionStatus" TEXT,
    "gitRefs" JSONB,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'task',
    "shortId" TEXT,
    "severity" TEXT,
    "bugReproducibility" TEXT,
    "bugStepsToReproduce" TEXT,
    "bugEnvironment" TEXT,
    "bugExpectedResult" TEXT,
    "bugActualResult" TEXT,
    "todoItems" JSONB,
    "milestoneId" TEXT,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_iterationId_fkey" FOREIGN KEY ("iterationId") REFERENCES "Iteration" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskDependency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "dependsOnTaskId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskDependency_dependsOnTaskId_fkey" FOREIGN KEY ("dependsOnTaskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskTag" (
    "taskId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    PRIMARY KEY ("taskId", "tagId"),
    CONSTRAINT "TaskTag_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT,
    "detail" JSONB,
    "source" TEXT,
    "metadata" JSONB,
    CONSTRAINT "TaskActivity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskActivity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaskTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskTemplateItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT,
    "priority" TEXT,
    "estimate" REAL,
    "parentItemId" TEXT,
    CONSTRAINT "TaskTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TaskTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIModelConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "taskTypes" JSONB,
    "maxTokens" INTEGER,
    "costPer1kTokens" REAL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "taskId" TEXT,
    "title" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "metadata" JSONB,
    CONSTRAINT "AIConversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AIConversation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "modelName" TEXT,
    "tokens" INTEGER,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIWorkflowDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "definition" JSONB NOT NULL,
    "createdBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AIWorkflowStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "stepType" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIWorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AIWorkflowDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIWorkflowRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "projectId" TEXT,
    "taskId" TEXT,
    "triggerType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "stepsState" JSONB,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIWorkflowRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AIWorkflowDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIWorkflowRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AIWorkflowRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIUsageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "projectId" TEXT,
    "taskId" TEXT,
    "conversationId" TEXT,
    "workflowRunId" TEXT,
    "modelName" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "estimatedCost" REAL,
    "requestPayload" JSONB,
    "responseMetadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIUsageLog_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AIUsageLog_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "AIWorkflowRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

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
    "channels" TEXT NOT NULL,
    "digestFrequency" TEXT,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "quietHoursTimezone" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Plugin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "manifest" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "localPath" TEXT,
    "remoteUrl" TEXT,
    "role" TEXT,
    "defaultBranch" TEXT,
    "provider" TEXT,
    "workspacePath" TEXT,
    "gitConfig" JSONB,
    "validationStatus" TEXT,
    "validationError" TEXT,
    "lastValidatedAt" DATETIME,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Repository_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Commit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repoId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT,
    "authorDate" DATETIME NOT NULL,
    "committerName" TEXT,
    "committerEmail" TEXT,
    "committerDate" DATETIME,
    "message" TEXT NOT NULL,
    "parentHashes" JSONB,
    "metadata" JSONB,
    CONSTRAINT "Commit_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommitFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "commitId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "oldPath" TEXT,
    "additions" INTEGER,
    "deletions" INTEGER,
    "changes" INTEGER,
    "metadata" JSONB,
    CONSTRAINT "CommitFile_commitId_fkey" FOREIGN KEY ("commitId") REFERENCES "Commit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PullRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repoId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "author" TEXT NOT NULL,
    "sourceBranch" TEXT NOT NULL,
    "targetBranch" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "labels" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "mergedAt" DATETIME,
    "metadata" JSONB,
    CONSTRAINT "PullRequest_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PullRequestReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "type" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "summary" TEXT,
    "comments" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "PullRequestReview_prId_fkey" FOREIGN KEY ("prId") REFERENCES "PullRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TerminalSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "repoId" TEXT,
    "name" TEXT,
    "shell" TEXT,
    "cwd" TEXT,
    "createdBy" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "metadata" JSONB,
    CONSTRAINT "TerminalSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TerminalSession_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repository" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommandExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "args" JSONB,
    "env" JSONB,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "exitCode" INTEGER,
    "status" TEXT NOT NULL,
    "outputRef" TEXT,
    "metadata" JSONB,
    CONSTRAINT "CommandExecution_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TerminalSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GitCommandExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "args" JSONB,
    "exitCode" INTEGER,
    "stdout" TEXT,
    "stderr" TEXT,
    "duration" INTEGER,
    "executedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "GitCommandExecution_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectWorkspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "localPath" TEXT,
    "remoteUrl" TEXT,
    "autoClone" BOOLEAN NOT NULL DEFAULT false,
    "validatedAt" DATETIME,
    "validationStatus" TEXT,
    "validationError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "metadata" JSONB,
    CONSTRAINT "ProjectWorkspace_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExternalProjectLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalProjectId" TEXT NOT NULL,
    "externalProjectUrl" TEXT NOT NULL,
    "syncConfig" JSONB,
    "lastSyncAt" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExternalProjectLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectDocLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "aiIndexed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectDocLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectApiDocLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "aiIndexed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectApiDocLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectHealthSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "healthScore" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectHealthSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectAIContext" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "techStack" JSONB,
    "languages" JSONB,
    "frameworks" JSONB,
    "domainTags" JSONB,
    "teamSizeCategory" TEXT,
    "lifecyclePhase" TEXT,
    "complexityLevel" TEXT,
    "riskIndicators" JSONB,
    "healthScore" INTEGER,
    "autoSummary" TEXT,
    "lastComputedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectAIContext_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "email" TEXT,
    "handle" TEXT,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "type" TEXT NOT NULL DEFAULT 'human',
    "status" TEXT NOT NULL DEFAULT 'active',
    "aiModelConfigId" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MemberProjectBinding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MemberActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DocumentAuthor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'author',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DocumentReviewer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'reviewer',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DocumentTaskLinkAssignee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentTaskLinkId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'assignee',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Mention" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "summary" TEXT,
    "category" TEXT NOT NULL DEFAULT 'custom',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "folderId" TEXT,
    "projectId" TEXT,
    "authorId" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publishedAt" DATETIME,
    CONSTRAINT "Document_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "DocumentFolder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentFolder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "projectId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocumentFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DocumentFolder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentApproval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submitterId" TEXT NOT NULL,
    "approverId" TEXT,
    "comment" TEXT,
    "version" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "DocumentApproval_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "anchor" TEXT NOT NULL,
    "content" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocumentSection_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentTaskLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT,
    "sectionId" TEXT,
    "taskId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "linkType" TEXT NOT NULL DEFAULT 'references',
    "note" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocumentTaskLink_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocumentTaskLink_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "DocumentSection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sectionsJson" TEXT,
    "summary" TEXT,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentReference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "sectionId" TEXT,
    "anchor" TEXT,
    "context" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentReference_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Runtime" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "displayName" TEXT,
    "hostPlatform" TEXT,
    "runtimeVersion" TEXT,
    "protocolVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "status" TEXT NOT NULL DEFAULT 'offline',
    "lastSeenAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "metadata" JSONB
);

-- CreateTable
CREATE TABLE "RuntimeSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runtimeId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "connectionMode" TEXT NOT NULL DEFAULT 'cli',
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" DATETIME,
    "lastHeartbeatAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "RuntimeSession_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "Runtime" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RuntimeCapabilitySnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runtimeSessionId" TEXT NOT NULL,
    "workspaceRoots" JSONB,
    "cliProviders" JSONB,
    "capabilityFlags" JSONB,
    "reportedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RuntimeCapabilitySnapshot_runtimeSessionId_fkey" FOREIGN KEY ("runtimeSessionId") REFERENCES "RuntimeSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExecutionRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "identitySource" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "role" TEXT,
    "level" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "input" JSONB,
    "output" JSONB,
    "errorDetail" JSONB,
    "contextSnapshotId" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "terminatedAt" DATETIME,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "metadata" JSONB,
    CONSTRAINT "ExecutionRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExecutionRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionRunId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "requestedAction" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approverPolicy" TEXT,
    "approvedBy" TEXT,
    "rejectedBy" TEXT,
    "resolutionNote" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "expiresAt" DATETIME,
    "metadata" JSONB,
    CONSTRAINT "ApprovalRequest_executionRunId_fkey" FOREIGN KEY ("executionRunId") REFERENCES "ExecutionRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApprovalRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExecutionStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionRunId" TEXT NOT NULL,
    "stepType" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT,
    "input" JSONB,
    "output" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "duration" INTEGER,
    "metadata" JSONB,
    CONSTRAINT "ExecutionStep_executionRunId_fkey" FOREIGN KEY ("executionRunId") REFERENCES "ExecutionRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExecutionArtifact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionRunId" TEXT NOT NULL,
    "stepId" TEXT,
    "artifactType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT,
    "storageRef" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExecutionArtifact_executionRunId_fkey" FOREIGN KEY ("executionRunId") REFERENCES "ExecutionRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContextPackSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionRunId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "payload" JSONB NOT NULL,
    "sourceSummary" JSONB,
    "freshness" TEXT NOT NULL DEFAULT 'realtime',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContextPackSnapshot_executionRunId_fkey" FOREIGN KEY ("executionRunId") REFERENCES "ExecutionRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CliSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runtimeId" TEXT NOT NULL,
    "runtimeSessionId" TEXT,
    "providerId" TEXT NOT NULL,
    "workspaceRoot" TEXT NOT NULL,
    "rawSessionRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "CliSession_runtimeId_fkey" FOREIGN KEY ("runtimeId") REFERENCES "Runtime" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CliExecutionBinding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionRunId" TEXT NOT NULL,
    "cliSessionId" TEXT NOT NULL,
    "runtimeId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "workspaceRoot" TEXT NOT NULL,
    "bindingMode" TEXT NOT NULL DEFAULT 'one-time',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CliExecutionBinding_executionRunId_fkey" FOREIGN KEY ("executionRunId") REFERENCES "ExecutionRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CliExecutionBinding_cliSessionId_fkey" FOREIGN KEY ("cliSessionId") REFERENCES "CliSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectModule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectModule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectSequence" (
    "projectId" TEXT NOT NULL PRIMARY KEY,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectSequence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
CREATE INDEX "idx_audit_logs_trace_id" ON "AuditLog"("traceId");

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
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE INDEX "idx_teams_owner_id" ON "Team"("ownerId");

-- CreateIndex
CREATE INDEX "idx_teams_status" ON "Team"("status");

-- CreateIndex
CREATE INDEX "idx_teams_slug" ON "Team"("slug");

-- CreateIndex
CREATE INDEX "idx_team_members_member_id" ON "TeamMember"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_memberId_key" ON "TeamMember"("teamId", "memberId");

-- CreateIndex
CREATE INDEX "idx_team_projects_project_id" ON "TeamProject"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamProject_teamId_projectId_key" ON "TeamProject"("teamId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvite_token_key" ON "TeamInvite"("token");

-- CreateIndex
CREATE INDEX "idx_team_invites_email" ON "TeamInvite"("email");

-- CreateIndex
CREATE INDEX "idx_team_invites_team_id" ON "TeamInvite"("teamId");

-- CreateIndex
CREATE INDEX "idx_task_watchers_member_id" ON "TaskWatcher"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskWatcher_taskId_memberId_key" ON "TaskWatcher"("taskId", "memberId");

-- CreateIndex
CREATE INDEX "idx_task_assignees_member_id" ON "TaskAssignee"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskAssignee_taskId_memberId_key" ON "TaskAssignee"("taskId", "memberId");

-- CreateIndex
CREATE INDEX "idx_agent_identity_project_id" ON "AgentIdentityBinding"("projectId");

-- CreateIndex
CREATE INDEX "idx_agent_identity_provider_id" ON "AgentIdentityBinding"("providerId");

-- CreateIndex
CREATE INDEX "idx_agent_identity_status" ON "AgentIdentityBinding"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AgentIdentityBinding_projectId_subjectType_subjectId_key" ON "AgentIdentityBinding"("projectId", "subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "idx_actor_claim_subject" ON "ActorClaimSnapshot"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "idx_actor_claim_project_id" ON "ActorClaimSnapshot"("projectId");

-- CreateIndex
CREATE INDEX "idx_actor_claim_expires_at" ON "ActorClaimSnapshot"("expiresAt");

-- CreateIndex
CREATE INDEX "idx_tags_project_id" ON "Tag"("projectId");

-- CreateIndex
CREATE INDEX "idx_tags_name_project" ON "Tag"("name", "projectId");

-- CreateIndex
CREATE INDEX "idx_document_tags_tag_id" ON "DocumentTag"("tagId");

-- CreateIndex
CREATE INDEX "idx_document_tags_document_id" ON "DocumentTag"("documentId");

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

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectCode_key" ON "Project"("projectCode");

-- CreateIndex
CREATE INDEX "idx_projects_status" ON "Project"("status");

-- CreateIndex
CREATE INDEX "idx_projects_created_by" ON "Project"("createdBy");

-- CreateIndex
CREATE INDEX "idx_projects_visibility_status" ON "Project"("visibility", "status");

-- CreateIndex
CREATE INDEX "idx_projects_source" ON "Project"("source");

-- CreateIndex
CREATE INDEX "idx_projects_priority" ON "Project"("priority");

-- CreateIndex
CREATE INDEX "idx_projects_workflow_status" ON "Project"("workflowStatus");

-- CreateIndex
CREATE INDEX "idx_projects_risk_level" ON "Project"("riskLevel");

-- CreateIndex
CREATE INDEX "idx_projects_owner_id" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "idx_projects_target_date" ON "Project"("targetDate");

-- CreateIndex
CREATE INDEX "idx_projects_last_activity_at" ON "Project"("lastActivityAt");

-- CreateIndex
CREATE INDEX "idx_project_members_user_id" ON "ProjectMember"("userId");

-- CreateIndex
CREATE INDEX "idx_iterations_project_id" ON "Iteration"("projectId");

-- CreateIndex
CREATE INDEX "idx_iterations_project_id_status" ON "Iteration"("projectId", "status");

-- CreateIndex
CREATE INDEX "idx_milestones_project_id" ON "Milestone"("projectId");

-- CreateIndex
CREATE INDEX "idx_milestones_project_id_status" ON "Milestone"("projectId", "status");

-- CreateIndex
CREATE INDEX "idx_milestones_iteration_id" ON "Milestone"("iterationId");

-- CreateIndex
CREATE INDEX "idx_milestone_tasks_task_id" ON "MilestoneTask"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_shortId_key" ON "Task"("shortId");

-- CreateIndex
CREATE INDEX "idx_tasks_project_id" ON "Task"("projectId");

-- CreateIndex
CREATE INDEX "idx_tasks_project_id_status" ON "Task"("projectId", "status");

-- CreateIndex
CREATE INDEX "idx_tasks_assignee_id_status" ON "Task"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "idx_tasks_iteration_id" ON "Task"("iterationId");

-- CreateIndex
CREATE INDEX "idx_tasks_parent_task_id" ON "Task"("parentTaskId");

-- CreateIndex
CREATE INDEX "idx_tasks_type" ON "Task"("type");

-- CreateIndex
CREATE INDEX "idx_tasks_milestone_id" ON "Task"("milestoneId");

-- CreateIndex
CREATE INDEX "idx_tasks_severity" ON "Task"("severity");

-- CreateIndex
CREATE INDEX "idx_task_dependencies_task_id" ON "TaskDependency"("taskId");

-- CreateIndex
CREATE INDEX "idx_task_dependencies_depends_on_task_id" ON "TaskDependency"("dependsOnTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskDependency_taskId_dependsOnTaskId_key" ON "TaskDependency"("taskId", "dependsOnTaskId");

-- CreateIndex
CREATE INDEX "idx_task_tags_tag_id" ON "TaskTag"("tagId");

-- CreateIndex
CREATE INDEX "idx_task_activities_task_id_timestamp" ON "TaskActivity"("taskId", "timestamp");

-- CreateIndex
CREATE INDEX "idx_task_activities_project_id" ON "TaskActivity"("projectId");

-- CreateIndex
CREATE INDEX "idx_task_activities_actor_id" ON "TaskActivity"("actorId");

-- CreateIndex
CREATE INDEX "idx_task_templates_project_id" ON "TaskTemplate"("projectId");

-- CreateIndex
CREATE INDEX "idx_task_template_items_template_id" ON "TaskTemplateItem"("templateId");

-- CreateIndex
CREATE INDEX "idx_ai_model_configs_provider" ON "AIModelConfig"("provider");

-- CreateIndex
CREATE INDEX "idx_ai_model_configs_enabled" ON "AIModelConfig"("enabled");

-- CreateIndex
CREATE INDEX "idx_ai_conversations_project_id" ON "AIConversation"("projectId");

-- CreateIndex
CREATE INDEX "idx_ai_conversations_task_id" ON "AIConversation"("taskId");

-- CreateIndex
CREATE INDEX "idx_ai_conversations_created_by" ON "AIConversation"("createdBy");

-- CreateIndex
CREATE INDEX "idx_ai_messages_conversation_id_created_at" ON "AIMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIWorkflowDefinition_key_key" ON "AIWorkflowDefinition"("key");

-- CreateIndex
CREATE INDEX "idx_ai_workflow_definitions_key" ON "AIWorkflowDefinition"("key");

-- CreateIndex
CREATE INDEX "idx_ai_workflow_steps_workflow_id_order" ON "AIWorkflowStep"("workflowId", "order");

-- CreateIndex
CREATE INDEX "idx_ai_workflow_runs_workflow_id" ON "AIWorkflowRun"("workflowId");

-- CreateIndex
CREATE INDEX "idx_ai_workflow_runs_project_id" ON "AIWorkflowRun"("projectId");

-- CreateIndex
CREATE INDEX "idx_ai_workflow_runs_task_id" ON "AIWorkflowRun"("taskId");

-- CreateIndex
CREATE INDEX "idx_ai_workflow_runs_status" ON "AIWorkflowRun"("status");

-- CreateIndex
CREATE INDEX "idx_ai_usage_logs_user_id" ON "AIUsageLog"("userId");

-- CreateIndex
CREATE INDEX "idx_ai_usage_logs_project_id" ON "AIUsageLog"("projectId");

-- CreateIndex
CREATE INDEX "idx_ai_usage_logs_model_name_created_at" ON "AIUsageLog"("modelName", "createdAt");

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
CREATE INDEX "idx_plugins_name" ON "Plugin"("name");

-- CreateIndex
CREATE INDEX "idx_plugins_enabled" ON "Plugin"("enabled");

-- CreateIndex
CREATE INDEX "idx_plugin_permissions_plugin_id_permission" ON "PluginPermission"("pluginId", "permission");

-- CreateIndex
CREATE INDEX "idx_repositories_project_id" ON "Repository"("projectId");

-- CreateIndex
CREATE INDEX "idx_repositories_provider" ON "Repository"("provider");

-- CreateIndex
CREATE INDEX "idx_repositories_validation_status" ON "Repository"("validationStatus");

-- CreateIndex
CREATE INDEX "idx_commits_repo_id_author_date" ON "Commit"("repoId", "authorDate");

-- CreateIndex
CREATE UNIQUE INDEX "Commit_repoId_hash_key" ON "Commit"("repoId", "hash");

-- CreateIndex
CREATE INDEX "idx_commit_files_commit_id" ON "CommitFile"("commitId");

-- CreateIndex
CREATE INDEX "idx_commit_files_path" ON "CommitFile"("path");

-- CreateIndex
CREATE INDEX "idx_pull_requests_repo_id_status" ON "PullRequest"("repoId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PullRequest_repoId_externalId_key" ON "PullRequest"("repoId", "externalId");

-- CreateIndex
CREATE INDEX "idx_pr_reviews_pr_id" ON "PullRequestReview"("prId");

-- CreateIndex
CREATE INDEX "idx_pr_reviews_reviewer_id" ON "PullRequestReview"("reviewerId");

-- CreateIndex
CREATE INDEX "idx_terminal_sessions_project_id" ON "TerminalSession"("projectId");

-- CreateIndex
CREATE INDEX "idx_terminal_sessions_created_by" ON "TerminalSession"("createdBy");

-- CreateIndex
CREATE INDEX "idx_terminal_sessions_status" ON "TerminalSession"("status");

-- CreateIndex
CREATE INDEX "idx_command_executions_session_id_start_time" ON "CommandExecution"("sessionId", "startTime");

-- CreateIndex
CREATE INDEX "idx_command_executions_status" ON "CommandExecution"("status");

-- CreateIndex
CREATE INDEX "idx_git_command_executions_repo_id_executed_at" ON "GitCommandExecution"("repoId", "executedAt");

-- CreateIndex
CREATE INDEX "idx_git_command_executions_user_id" ON "GitCommandExecution"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectWorkspace_projectId_key" ON "ProjectWorkspace"("projectId");

-- CreateIndex
CREATE INDEX "idx_project_workspaces_project_id" ON "ProjectWorkspace"("projectId");

-- CreateIndex
CREATE INDEX "idx_project_workspaces_validation_status" ON "ProjectWorkspace"("validationStatus");

-- CreateIndex
CREATE INDEX "idx_external_project_links_project_id" ON "ExternalProjectLink"("projectId");

-- CreateIndex
CREATE INDEX "idx_external_project_links_provider" ON "ExternalProjectLink"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalProjectLink_projectId_provider_key" ON "ExternalProjectLink"("projectId", "provider");

-- CreateIndex
CREATE INDEX "idx_project_doc_links_project_id" ON "ProjectDocLink"("projectId");

-- CreateIndex
CREATE INDEX "idx_project_doc_links_ai_indexed" ON "ProjectDocLink"("aiIndexed");

-- CreateIndex
CREATE INDEX "idx_project_api_doc_links_project_id" ON "ProjectApiDocLink"("projectId");

-- CreateIndex
CREATE INDEX "idx_project_api_doc_links_ai_indexed" ON "ProjectApiDocLink"("aiIndexed");

-- CreateIndex
CREATE INDEX "idx_project_health_snapshots_project_id_date" ON "ProjectHealthSnapshot"("projectId", "date");

-- CreateIndex
CREATE INDEX "idx_project_health_snapshots_date" ON "ProjectHealthSnapshot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAIContext_projectId_key" ON "ProjectAIContext"("projectId");

-- CreateIndex
CREATE INDEX "idx_project_ai_contexts_project_id" ON "ProjectAIContext"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_userId_key" ON "Member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_handle_key" ON "Member"("handle");

-- CreateIndex
CREATE INDEX "idx_members_user_id" ON "Member"("userId");

-- CreateIndex
CREATE INDEX "idx_members_status" ON "Member"("status");

-- CreateIndex
CREATE INDEX "idx_members_type" ON "Member"("type");

-- CreateIndex
CREATE INDEX "idx_members_ai_model_config_id" ON "Member"("aiModelConfigId");

-- CreateIndex
CREATE INDEX "idx_member_project_bindings_member_id" ON "MemberProjectBinding"("memberId");

-- CreateIndex
CREATE INDEX "idx_member_project_bindings_project_id" ON "MemberProjectBinding"("projectId");

-- CreateIndex
CREATE INDEX "idx_member_activities_member_id_created_at" ON "MemberActivity"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_document_authors_member_id" ON "DocumentAuthor"("memberId");

-- CreateIndex
CREATE INDEX "idx_document_authors_document_id" ON "DocumentAuthor"("documentId");

-- CreateIndex
CREATE INDEX "idx_document_reviewers_member_id" ON "DocumentReviewer"("memberId");

-- CreateIndex
CREATE INDEX "idx_document_reviewers_document_id" ON "DocumentReviewer"("documentId");

-- CreateIndex
CREATE INDEX "idx_document_task_link_assignees_member_id" ON "DocumentTaskLinkAssignee"("memberId");

-- CreateIndex
CREATE INDEX "idx_document_task_link_assignees_document_task_link_id" ON "DocumentTaskLinkAssignee"("documentTaskLinkId");

-- CreateIndex
CREATE INDEX "idx_mentions_member_id" ON "Mention"("memberId");

-- CreateIndex
CREATE INDEX "idx_mentions_source" ON "Mention"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "idx_documents_folder_id" ON "Document"("folderId");

-- CreateIndex
CREATE INDEX "idx_documents_project_id" ON "Document"("projectId");

-- CreateIndex
CREATE INDEX "idx_documents_author_id" ON "Document"("authorId");

-- CreateIndex
CREATE INDEX "idx_documents_status" ON "Document"("status");

-- CreateIndex
CREATE INDEX "idx_documents_category" ON "Document"("category");

-- CreateIndex
CREATE INDEX "idx_documents_is_deleted" ON "Document"("isDeleted");

-- CreateIndex
CREATE INDEX "idx_document_folders_parent_id" ON "DocumentFolder"("parentId");

-- CreateIndex
CREATE INDEX "idx_document_folders_project_id" ON "DocumentFolder"("projectId");

-- CreateIndex
CREATE INDEX "idx_document_approvals_document_id" ON "DocumentApproval"("documentId");

-- CreateIndex
CREATE INDEX "idx_document_approvals_status" ON "DocumentApproval"("status");

-- CreateIndex
CREATE INDEX "idx_document_approvals_submitter" ON "DocumentApproval"("submitterId");

-- CreateIndex
CREATE INDEX "idx_document_sections_document_id" ON "DocumentSection"("documentId");

-- CreateIndex
CREATE INDEX "idx_document_sections_order" ON "DocumentSection"("documentId", "order");

-- CreateIndex
CREATE INDEX "idx_document_task_links_document_id" ON "DocumentTaskLink"("documentId");

-- CreateIndex
CREATE INDEX "idx_document_task_links_section_id" ON "DocumentTaskLink"("sectionId");

-- CreateIndex
CREATE INDEX "idx_document_task_links_task_id" ON "DocumentTaskLink"("taskId");

-- CreateIndex
CREATE INDEX "idx_document_task_links_project_id" ON "DocumentTaskLink"("projectId");

-- CreateIndex
CREATE INDEX "idx_document_versions_document_id" ON "DocumentVersion"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_version_key" ON "DocumentVersion"("documentId", "version");

-- CreateIndex
CREATE INDEX "idx_document_references_source" ON "DocumentReference"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "idx_document_references_document_id" ON "DocumentReference"("documentId");

-- CreateIndex
CREATE INDEX "idx_runtimes_user_id" ON "Runtime"("userId");

-- CreateIndex
CREATE INDEX "idx_runtimes_status" ON "Runtime"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Runtime_userId_deviceId_key" ON "Runtime"("userId", "deviceId");

-- CreateIndex
CREATE INDEX "idx_runtime_sessions_runtime_id" ON "RuntimeSession"("runtimeId");

-- CreateIndex
CREATE INDEX "idx_runtime_sessions_status" ON "RuntimeSession"("status");

-- CreateIndex
CREATE INDEX "idx_runtime_sessions_last_heartbeat" ON "RuntimeSession"("lastHeartbeatAt");

-- CreateIndex
CREATE INDEX "idx_runtime_caps_session_id" ON "RuntimeCapabilitySnapshot"("runtimeSessionId");

-- CreateIndex
CREATE INDEX "idx_execution_runs_project_id" ON "ExecutionRun"("projectId");

-- CreateIndex
CREATE INDEX "idx_execution_runs_task_id" ON "ExecutionRun"("taskId");

-- CreateIndex
CREATE INDEX "idx_execution_runs_subject" ON "ExecutionRun"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "idx_execution_runs_status" ON "ExecutionRun"("status");

-- CreateIndex
CREATE INDEX "idx_execution_runs_created_at" ON "ExecutionRun"("createdAt");

-- CreateIndex
CREATE INDEX "idx_approval_requests_execution_run_id" ON "ApprovalRequest"("executionRunId");

-- CreateIndex
CREATE INDEX "idx_approval_requests_status" ON "ApprovalRequest"("status");

-- CreateIndex
CREATE INDEX "idx_approval_requests_project_status" ON "ApprovalRequest"("projectId", "status");

-- CreateIndex
CREATE INDEX "idx_approval_requests_requested_at" ON "ApprovalRequest"("requestedAt");

-- CreateIndex
CREATE INDEX "idx_execution_steps_run_sequence" ON "ExecutionStep"("executionRunId", "sequence");

-- CreateIndex
CREATE INDEX "idx_execution_artifacts_run_id" ON "ExecutionArtifact"("executionRunId");

-- CreateIndex
CREATE INDEX "idx_execution_artifacts_type" ON "ExecutionArtifact"("artifactType");

-- CreateIndex
CREATE UNIQUE INDEX "ContextPackSnapshot_executionRunId_key" ON "ContextPackSnapshot"("executionRunId");

-- CreateIndex
CREATE INDEX "idx_context_pack_snapshots_project_id" ON "ContextPackSnapshot"("projectId");

-- CreateIndex
CREATE INDEX "idx_context_pack_snapshots_task_id" ON "ContextPackSnapshot"("taskId");

-- CreateIndex
CREATE INDEX "idx_cli_sessions_runtime_id" ON "CliSession"("runtimeId");

-- CreateIndex
CREATE INDEX "idx_cli_sessions_provider_id" ON "CliSession"("providerId");

-- CreateIndex
CREATE INDEX "idx_cli_sessions_status" ON "CliSession"("status");

-- CreateIndex
CREATE INDEX "idx_cli_exec_bindings_run_id" ON "CliExecutionBinding"("executionRunId");

-- CreateIndex
CREATE INDEX "idx_cli_exec_bindings_session_id" ON "CliExecutionBinding"("cliSessionId");

-- CreateIndex
CREATE INDEX "ProjectModule_projectId_idx" ON "ProjectModule"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectModule_projectId_code_key" ON "ProjectModule"("projectId", "code");
