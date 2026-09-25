-- 同类型多供应商槽位（P2-22）：类型唯一放开为 (provider, displayName) 组合唯一。
-- 存量数据每类型最多一条（原 provider @unique），组合唯一天然满足，迁移无损。
-- 注意：主线程统一执行 prisma migrate dev/deploy，本文件仅随 schema 提交。

DROP INDEX IF EXISTS "AIProviderConfig_provider_key";
CREATE UNIQUE INDEX "uniq_ai_provider_configs_provider_display_name" ON "AIProviderConfig"("provider", "displayName");
