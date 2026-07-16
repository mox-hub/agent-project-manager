-- Team & Member core models
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "avatarUrl" TEXT,
    "color" TEXT,
    "ownerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "metadata" JSONB
);

CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");
CREATE INDEX "idx_teams_owner_id" ON "Team"("ownerId");
CREATE INDEX "idx_teams_status" ON "Team"("status");

CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uniq_team_member" ON "TeamMember"("teamId", "memberId");
CREATE INDEX "idx_team_members_member_id" ON "TeamMember"("memberId");

CREATE TABLE "TeamProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'contributor',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamProject_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uniq_team_project" ON "TeamProject"("teamId", "projectId");
CREATE INDEX "idx_team_projects_project_id" ON "TeamProject"("projectId");

CREATE TABLE "TeamInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "email" TEXT,
    "inviteeMemberId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" DATETIME NOT NULL,
    "invitedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" DATETIME,
    CONSTRAINT "TeamInvite_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TeamInvite_token_key" ON "TeamInvite"("token");
CREATE INDEX "idx_team_invites_team_id" ON "TeamInvite"("teamId");
CREATE INDEX "idx_team_invites_status" ON "TeamInvite"("status");

CREATE TABLE "Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "email" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "userId" TEXT,
    "phone" TEXT,
    "timezone" TEXT,
    "aiModelConfigId" TEXT,
    "aiProvider" TEXT,
    "systemPrompt" TEXT,
    "capabilities" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastActiveAt" DATETIME,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "tagsJson" JSONB,
    "metadata" JSONB,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Member_aiModelConfigId_fkey" FOREIGN KEY ("aiModelConfigId") REFERENCES "AIModelConfig" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Member_handle_key" ON "Member"("handle");
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");
CREATE UNIQUE INDEX "Member_userId_key" ON "Member"("userId");
CREATE INDEX "idx_members_type" ON "Member"("type");
CREATE INDEX "idx_members_status" ON "Member"("status");
CREATE INDEX "idx_members_user_id" ON "Member"("userId");
CREATE INDEX "idx_members_ai_model_id" ON "Member"("aiModelConfigId");

CREATE TABLE "MemberProjectBinding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "MemberProjectBinding_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberProjectBinding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uniq_member_project_binding" ON "MemberProjectBinding"("memberId", "projectId");
CREATE INDEX "idx_member_project_project_id" ON "MemberProjectBinding"("projectId");

CREATE TABLE "TaskAssignee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'assignee',
    "assignedBy" TEXT,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskAssignee_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskAssignee_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uniq_task_assignee_role" ON "TaskAssignee"("taskId", "memberId", "role");
CREATE INDEX "idx_task_assignees_member_id" ON "TaskAssignee"("memberId");
CREATE INDEX "idx_task_assignees_task_role" ON "TaskAssignee"("taskId", "role");

CREATE TABLE "TaskWatcher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskWatcher_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskWatcher_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uniq_task_watcher" ON "TaskWatcher"("taskId", "memberId");
CREATE INDEX "idx_task_watchers_member_id" ON "TaskWatcher"("memberId");

CREATE TABLE "DocumentAuthor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'author',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentAuthor_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentAuthor_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uniq_document_author_role" ON "DocumentAuthor"("documentId", "memberId", "role");
CREATE INDEX "idx_document_authors_member_id" ON "DocumentAuthor"("memberId");

CREATE TABLE "DocumentReviewer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedAt" DATETIME,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentReviewer_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentReviewer_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uniq_document_reviewer" ON "DocumentReviewer"("documentId", "memberId");
CREATE INDEX "idx_document_reviewers_member_id" ON "DocumentReviewer"("memberId");

CREATE TABLE "DocumentTaskLinkAssignee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentTaskLinkId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentTaskLinkAssignee_documentTaskLinkId_fkey" FOREIGN KEY ("documentTaskLinkId") REFERENCES "DocumentTaskLink" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentTaskLinkAssignee_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uniq_doc_task_link_assignee" ON "DocumentTaskLinkAssignee"("documentTaskLinkId", "memberId", "role");
CREATE INDEX "idx_doc_task_link_assignees_member_id" ON "DocumentTaskLinkAssignee"("memberId");

CREATE TABLE "Mention" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "mentionerId" TEXT,
    "context" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Mention_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_mentions_source" ON "Mention"("sourceType", "sourceId");
CREATE INDEX "idx_mentions_member_id" ON "Mention"("memberId");

CREATE TABLE "MemberActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemberActivity_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_member_activities_member_created" ON "MemberActivity"("memberId", "createdAt");

-- Add memberId to ExecutionRun for AI Member takeover
ALTER TABLE "ExecutionRun" ADD COLUMN "memberId" TEXT REFERENCES "Member"("id") ON DELETE SET NULL;
CREATE INDEX "idx_execution_runs_member_id" ON "ExecutionRun"("memberId");
