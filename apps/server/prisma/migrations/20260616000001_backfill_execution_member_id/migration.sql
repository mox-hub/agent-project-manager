-- Backfill ExecutionRun.memberId from subjectId when subjectType=platform_ai_member
-- Try to match by handle or by id. Skip rows that don't match.
UPDATE "ExecutionRun"
SET "memberId" = (
  SELECT m.id FROM "Member" m
  WHERE m.id = "ExecutionRun"."subjectId" OR m.handle = "ExecutionRun"."subjectId"
  LIMIT 1
)
WHERE "subjectType" = 'platform_ai_member' AND "memberId" IS NULL;
