-- CAP-S-03 workflow v2 引擎（D4 死表改造 + journal 双层账）：
-- 1) AIWorkflowStep 死表退役（全仓零写入实证，PR 合入前已核）；重造为 WorkflowNodeRun
-- 2) WorkflowEvent 事件流（seq 单调可回放）
-- 3) AIWorkflowRun 增 engineVersion（v1/v2 双栈路由）与 graphSnapshot（运行时定义快照）
-- 注意：SQLite 下 Json 列须声明 JSONB（对齐 20260913 release_driver_pipeline 先例）——
-- "JSON" 会落 NUMERIC affinity，Prisma RETURNING 读回即 "Value JSON not supported"。

DROP TABLE IF EXISTS "AIWorkflowStep";

ALTER TABLE "AIWorkflowRun" ADD COLUMN "engineVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "AIWorkflowRun" ADD COLUMN "graphSnapshot" JSONB;

CREATE TABLE "WorkflowNodeRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "error" JSONB,
    "executionRunId" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkflowNodeRun_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AIWorkflowRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uniq_workflow_node_runs_run_node_attempt" ON "WorkflowNodeRun"("runId" ASC, "nodeId" ASC, "attempt" ASC);
CREATE INDEX "idx_workflow_node_runs_run_status" ON "WorkflowNodeRun"("runId" ASC, "status" ASC);
CREATE INDEX "idx_workflow_node_runs_execution_run_id" ON "WorkflowNodeRun"("executionRunId" ASC);

CREATE TABLE "WorkflowEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AIWorkflowRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uniq_workflow_events_run_seq" ON "WorkflowEvent"("runId" ASC, "seq" ASC);
CREATE INDEX "idx_workflow_events_run_id" ON "WorkflowEvent"("runId" ASC);
