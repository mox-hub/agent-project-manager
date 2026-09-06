-- ExecutionRun -> Execution：工单执行项统一模型（人工/AI 共用）
-- 诚实迁移：存量数据不生成新字段值，仅物理改名并补充独立的标题/描述列
ALTER TABLE "ExecutionRun" RENAME TO "Execution";
ALTER TABLE "Execution" ADD COLUMN "title" TEXT;
ALTER TABLE "Execution" ADD COLUMN "description" TEXT;
