-- 阶段三 D：表名派生索引旧名清理（模型 Task 族→Issue 族后的尾巴）
-- SQLite 无 ALTER INDEX RENAME；唯一约束索引用 DROP + CREATE UNIQUE 重建（列不变，约束语义不变）

-- 普通索引：建新删旧
CREATE INDEX "idx_issue_watchers_member_id" ON "IssueWatcher"("memberId");
DROP INDEX "idx_task_watchers_member_id";

CREATE INDEX "idx_issue_assignees_member_id" ON "IssueAssignee"("memberId");
DROP INDEX "idx_task_assignees_member_id";

CREATE INDEX "idx_issue_templates_project_id" ON "IssueTemplate"("projectId");
DROP INDEX "idx_task_templates_project_id";

CREATE INDEX "idx_issue_template_items_template_id" ON "IssueTemplateItem"("templateId");
DROP INDEX "idx_task_template_items_template_id";

CREATE INDEX "idx_issue_activities_project_id" ON "IssueActivity"("projectId");
DROP INDEX "idx_task_activities_project_id";

CREATE INDEX "idx_issue_activities_actor_id" ON "IssueActivity"("actorId");
DROP INDEX "idx_task_activities_actor_id";

CREATE INDEX "idx_issue_activities_issue_id_timestamp" ON "IssueActivity"("issueId", "timestamp");
DROP INDEX "idx_task_activities_issue_id_timestamp";

CREATE INDEX "idx_issue_tags_tag_id" ON "IssueTag"("tagId");
DROP INDEX "idx_task_tags_tag_id";

CREATE INDEX "idx_issue_provider_links_project_id" ON "IssueProviderLink"("projectId");
DROP INDEX "idx_task_provider_links_project_id";

CREATE INDEX "idx_issue_provider_links_external" ON "IssueProviderLink"("externalProvider", "externalProjectId");
DROP INDEX "idx_task_provider_links_external";

CREATE INDEX "idx_issue_dependencies_issue_id" ON "IssueDependency"("issueId");
DROP INDEX "idx_task_dependencies_issue_id";

CREATE INDEX "idx_issue_dependencies_depends_on_issue_id" ON "IssueDependency"("dependsOnIssueId");
DROP INDEX "idx_task_dependencies_depends_on_issue_id";

-- 唯一约束索引：Prisma 默认命名随模型改名，重建
CREATE UNIQUE INDEX "Issue_shortId_key" ON "Issue"("shortId");
DROP INDEX "Task_shortId_key";

CREATE UNIQUE INDEX "IssueProviderLink_integrationId_externalProjectId_key" ON "IssueProviderLink"("integrationId", "externalProjectId");
DROP INDEX "TaskProviderLink_integrationId_externalProjectId_key";

-- 保留旧名（模型本名未改）：idx_milestone_tasks_issue_id、idx_document_task_link* 系列
