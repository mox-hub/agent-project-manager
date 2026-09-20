-- 剧本游标（v2 纪要 §3.4）：可选挂载，不挂 = 自由模式
ALTER TABLE "Project" ADD COLUMN "playbookRef" TEXT;
ALTER TABLE "Project" ADD COLUMN "lifecycleStage" TEXT;
