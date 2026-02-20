-- AlterTable
ALTER TABLE "Repository" ADD COLUMN "gitConfig" JSONB;
ALTER TABLE "Repository" ADD COLUMN "lastValidatedAt" DATETIME;
ALTER TABLE "Repository" ADD COLUMN "validationError" TEXT;
ALTER TABLE "Repository" ADD COLUMN "validationStatus" TEXT;
ALTER TABLE "Repository" ADD COLUMN "workspacePath" TEXT;

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
CREATE INDEX "idx_repositories_validation_status" ON "Repository"("validationStatus");
