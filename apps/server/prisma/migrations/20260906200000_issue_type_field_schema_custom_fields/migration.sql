-- 阶段四：IssueType 适配引擎二期——fieldSchema + customFields，bug 六字段迁入 JSON
ALTER TABLE "IssueType" ADD COLUMN "fieldSchema" JSONB;
ALTER TABLE "Issue" ADD COLUMN "customFields" JSONB;

-- 内置 bug 类型的字段定义（label 中文；severity 为 select，其余文本域/文本）
UPDATE "IssueType" SET "fieldSchema" = '[
  {"key":"severity","label":"严重度","type":"select","options":["critical","high","medium","low"],"order":1},
  {"key":"bugReproducibility","label":"可复现性","type":"text","order":2},
  {"key":"bugStepsToReproduce","label":"复现步骤","type":"textarea","order":3},
  {"key":"bugEnvironment","label":"环境信息","type":"textarea","order":4},
  {"key":"bugExpectedResult","label":"预期结果","type":"textarea","order":5},
  {"key":"bugActualResult","label":"实际结果","type":"textarea","order":6}
]' WHERE "key" = 'bug';

-- 存量 bug 工单：六列值回填进 customFields（含 null 键，简化语义；仅 type='bug' 且任一列非空时写入）
UPDATE "Issue"
SET "customFields" = json_object(
  'severity', "severity",
  'bugReproducibility', "bugReproducibility",
  'bugStepsToReproduce', "bugStepsToReproduce",
  'bugEnvironment', "bugEnvironment",
  'bugExpectedResult', "bugExpectedResult",
  'bugActualResult', "bugActualResult"
)
WHERE "type" = 'bug'
  AND ("severity" IS NOT NULL OR "bugReproducibility" IS NOT NULL OR "bugStepsToReproduce" IS NOT NULL
    OR "bugEnvironment" IS NOT NULL OR "bugExpectedResult" IS NOT NULL OR "bugActualResult" IS NOT NULL);

-- 列依赖索引先删，再删列（SQLite DROP COLUMN 不允许被索引引用）
DROP INDEX IF EXISTS "idx_issues_severity";
ALTER TABLE "Issue" DROP COLUMN "severity";
ALTER TABLE "Issue" DROP COLUMN "bugReproducibility";
ALTER TABLE "Issue" DROP COLUMN "bugStepsToReproduce";
ALTER TABLE "Issue" DROP COLUMN "bugEnvironment";
ALTER TABLE "Issue" DROP COLUMN "bugExpectedResult";
ALTER TABLE "Issue" DROP COLUMN "bugActualResult";
