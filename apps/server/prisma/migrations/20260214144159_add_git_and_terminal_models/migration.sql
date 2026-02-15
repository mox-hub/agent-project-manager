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

-- CreateIndex
CREATE INDEX "idx_repositories_project_id" ON "Repository"("projectId");

-- CreateIndex
CREATE INDEX "idx_repositories_provider" ON "Repository"("provider");

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
