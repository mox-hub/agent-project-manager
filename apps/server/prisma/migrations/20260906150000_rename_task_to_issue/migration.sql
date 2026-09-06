-- Rename Task model family to Issue (slice 4a: physical table rename only)
ALTER TABLE "Task" RENAME TO "Issue";
ALTER TABLE "TaskAssignee" RENAME TO "IssueAssignee";
ALTER TABLE "TaskActivity" RENAME TO "IssueActivity";
ALTER TABLE "TaskDependency" RENAME TO "IssueDependency";
ALTER TABLE "TaskTemplate" RENAME TO "IssueTemplate";
ALTER TABLE "TaskTemplateItem" RENAME TO "IssueTemplateItem";
ALTER TABLE "TaskTag" RENAME TO "IssueTag";
ALTER TABLE "TaskProviderLink" RENAME TO "IssueProviderLink";
ALTER TABLE "TaskWatcher" RENAME TO "IssueWatcher";
