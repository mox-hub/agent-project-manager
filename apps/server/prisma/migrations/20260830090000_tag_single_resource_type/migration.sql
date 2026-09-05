-- 标签不再跨功能共享：resourceTypes JSON 数组 → 单一 resourceType（取原数组首元素，缺省 task）
ALTER TABLE "Tag" ADD COLUMN "resourceType" TEXT NOT NULL DEFAULT 'task';
UPDATE "Tag" SET "resourceType" = COALESCE(json_extract("resourceTypes", '$[0]'), 'task');
ALTER TABLE "Tag" DROP COLUMN "resourceTypes";
