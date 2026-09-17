-- CAP-A-19 批 5 重试血缘：失败/阻塞执行重新执行时克隆新建执行，
-- Execution.retryOfId 指向原执行，保留失败现场历史并支撑血缘查询。
-- 外键约束不做 DB 级 ADD CONSTRAINT（SQLite 不支持），关联完整性由
-- Prisma schema 自关联声明 + 应用层校验（retryExecution 状态/归属校验）维护。

-- AlterTable
ALTER TABLE "Execution" ADD COLUMN "retryOfId" TEXT;

-- CreateIndex
CREATE INDEX "idx_execution_runs_retry_of_id" ON "Execution"("retryOfId");
