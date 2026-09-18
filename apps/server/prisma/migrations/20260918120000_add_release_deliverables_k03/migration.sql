-- CAP-K-03 批二·交付成果清单：Release.deliverables 单字段承载
-- 结构：{ items: [{name, location, howToVerify, limitations?, receiver?}], updatedBy, updatedAt }
-- 边界：不自建部署平台，部署状态从外部 CI/CD 回流；清单只记录交付物与验证口径
-- 注意：SQLite 下 Json 列须声明 JSONB（对齐 20260913 release_driver_pipeline 先例）——
-- "JSON" 会落 NUMERIC affinity，Prisma RETURNING 读回即 "Value JSON not supported"。

ALTER TABLE "Release" ADD COLUMN "deliverables" JSONB;
