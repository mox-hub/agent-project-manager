-- 标签管理面统一批（2026-10-01）：updatedAt 列 + bug 标签域并入 task
-- 1) updatedAt：标签列表「更新时间」列（@updatedAt 由 Prisma 写入）。
--    SQLite ADD COLUMN 禁非常量默认，故两段式：加可空列 + 存量回填；
--    业务非空由 Prisma @updatedAt 保证（create/update 必写）。
ALTER TABLE "Tag" ADD COLUMN "updatedAt" TIMESTAMP;
UPDATE "Tag" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;
-- 2) bug 域废弃（任务/工单已统一标签系统）：存量 bug 域标签并入 task 域（tagId 关联不变，数据不丢）
UPDATE "Tag" SET "resourceType" = 'task' WHERE "resourceType" = 'bug';
