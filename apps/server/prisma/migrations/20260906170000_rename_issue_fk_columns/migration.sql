-- 切片 4c：Issue 族外键标量列改名（taskId → issueId 等），同步索引名

-- 1) 列改名（SQLite ALTER TABLE RENAME COLUMN 会自动更新引用该列的索引/约束定义）
ALTER TABLE "IssueWatcher" RENAME COLUMN "taskId" TO "issueId";
ALTER TABLE "IssueAssignee" RENAME COLUMN "taskId" TO "issueId";
ALTER TABLE "MilestoneTask" RENAME COLUMN "taskId" TO "issueId";
ALTER TABLE "Issue" RENAME COLUMN "parentTaskId" TO "parentIssueId";
ALTER TABLE "IssueDependency" RENAME COLUMN "taskId" TO "issueId";
ALTER TABLE "IssueDependency" RENAME COLUMN "dependsOnTaskId" TO "dependsOnIssueId";
ALTER TABLE "IssueTag" RENAME COLUMN "taskId" TO "issueId";
ALTER TABLE "IssueActivity" RENAME COLUMN "taskId" TO "issueId";
ALTER TABLE "AIConversation" RENAME COLUMN "taskId" TO "issueId";
ALTER TABLE "AIWorkflowRun" RENAME COLUMN "taskId" TO "issueId";
ALTER TABLE "AIUsageLog" RENAME COLUMN "taskId" TO "issueId";
ALTER TABLE "ExternalIssueLink" RENAME COLUMN "taskId" TO "issueId";
ALTER TABLE "Notification" RENAME COLUMN "taskId" TO "issueId";
ALTER TABLE "DocumentTaskLink" RENAME COLUMN "taskId" TO "issueId";
ALTER TABLE "Execution" RENAME COLUMN "taskId" TO "issueId";
ALTER TABLE "Acceptance" RENAME COLUMN "taskId" TO "issueId";
ALTER TABLE "ApprovalRequest" RENAME COLUMN "taskId" TO "issueId";
ALTER TABLE "ContextPackSnapshot" RENAME COLUMN "taskId" TO "issueId";
ALTER TABLE "DecisionProposal" RENAME COLUMN "taskId" TO "issueId";

-- 2) 索引改名（SQLite 无 RENAME INDEX，使用 DROP + CREATE；列名用新口径）
-- 唯一索引（Prisma 默认命名，随模型/字段名更新）
DROP INDEX IF EXISTS "TaskWatcher_taskId_memberId_key";
CREATE UNIQUE INDEX "IssueWatcher_issueId_memberId_key" ON "IssueWatcher"("issueId", "memberId");
DROP INDEX IF EXISTS "TaskAssignee_taskId_memberId_key";
CREATE UNIQUE INDEX "IssueAssignee_issueId_memberId_key" ON "IssueAssignee"("issueId", "memberId");
DROP INDEX IF EXISTS "TaskDependency_taskId_dependsOnTaskId_key";
CREATE UNIQUE INDEX "IssueDependency_issueId_dependsOnIssueId_key" ON "IssueDependency"("issueId", "dependsOnIssueId");
DROP INDEX IF EXISTS "DecisionProposal_taskId_idx";
CREATE INDEX "DecisionProposal_issueId_idx" ON "DecisionProposal"("issueId");

-- Issue 表 idx_tasks_* → idx_issues_*
DROP INDEX IF EXISTS "idx_tasks_project_id";
CREATE INDEX "idx_issues_project_id" ON "Issue"("projectId");
DROP INDEX IF EXISTS "idx_tasks_project_id_status";
CREATE INDEX "idx_issues_project_id_status" ON "Issue"("projectId", "status");
DROP INDEX IF EXISTS "idx_tasks_assignee_id_status";
CREATE INDEX "idx_issues_assignee_id_status" ON "Issue"("assigneeId", "status");
DROP INDEX IF EXISTS "idx_tasks_iteration_id";
CREATE INDEX "idx_issues_iteration_id" ON "Issue"("iterationId");
DROP INDEX IF EXISTS "idx_tasks_parent_task_id";
CREATE INDEX "idx_issues_parent_issue_id" ON "Issue"("parentIssueId");
DROP INDEX IF EXISTS "idx_tasks_type";
CREATE INDEX "idx_issues_type" ON "Issue"("type");
DROP INDEX IF EXISTS "idx_tasks_type_id";
CREATE INDEX "idx_issues_type_id" ON "Issue"("typeId");
DROP INDEX IF EXISTS "idx_tasks_milestone_id";
CREATE INDEX "idx_issues_milestone_id" ON "Issue"("milestoneId");
DROP INDEX IF EXISTS "idx_tasks_severity";
CREATE INDEX "idx_issues_severity" ON "Issue"("severity");
DROP INDEX IF EXISTS "idx_tasks_external_ref";
CREATE INDEX "idx_issues_external_ref" ON "Issue"("externalProvider", "externalIssueId");

-- 其余 *_task_id → *_issue_id
DROP INDEX IF EXISTS "idx_milestone_tasks_task_id";
CREATE INDEX "idx_milestone_tasks_issue_id" ON "MilestoneTask"("issueId");
DROP INDEX IF EXISTS "idx_task_dependencies_task_id";
CREATE INDEX "idx_task_dependencies_issue_id" ON "IssueDependency"("issueId");
DROP INDEX IF EXISTS "idx_task_dependencies_depends_on_task_id";
CREATE INDEX "idx_task_dependencies_depends_on_issue_id" ON "IssueDependency"("dependsOnIssueId");
DROP INDEX IF EXISTS "idx_task_activities_task_id_timestamp";
CREATE INDEX "idx_task_activities_issue_id_timestamp" ON "IssueActivity"("issueId", "timestamp");
DROP INDEX IF EXISTS "idx_ai_conversations_task_id";
CREATE INDEX "idx_ai_conversations_issue_id" ON "AIConversation"("issueId");
DROP INDEX IF EXISTS "idx_ai_workflow_runs_task_id";
CREATE INDEX "idx_ai_workflow_runs_issue_id" ON "AIWorkflowRun"("issueId");
DROP INDEX IF EXISTS "idx_external_issue_links_task_id";
CREATE INDEX "idx_external_issue_links_issue_id" ON "ExternalIssueLink"("issueId");
DROP INDEX IF EXISTS "idx_notifications_task_id";
CREATE INDEX "idx_notifications_issue_id" ON "Notification"("issueId");
DROP INDEX IF EXISTS "idx_document_task_links_task_id";
CREATE INDEX "idx_document_task_links_issue_id" ON "DocumentTaskLink"("issueId");
DROP INDEX IF EXISTS "idx_execution_runs_task_id";
CREATE INDEX "idx_execution_runs_issue_id" ON "Execution"("issueId");
DROP INDEX IF EXISTS "idx_acceptances_task_id";
CREATE INDEX "idx_acceptances_issue_id" ON "Acceptance"("issueId");
DROP INDEX IF EXISTS "idx_context_pack_snapshots_task_id";
CREATE INDEX "idx_context_pack_snapshots_issue_id" ON "ContextPackSnapshot"("issueId");
