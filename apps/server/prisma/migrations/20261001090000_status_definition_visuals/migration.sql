-- 设置状态页真实化（2026-10-01）：StatusDefinition 视觉与描述列
-- color/icon 供管理面与列表端真实渲染（空 = 前端静态语义映射兜底）；description 为组内行说明文案
ALTER TABLE "StatusDefinition" ADD COLUMN "color" TEXT;
ALTER TABLE "StatusDefinition" ADD COLUMN "icon" TEXT;
ALTER TABLE "StatusDefinition" ADD COLUMN "description" TEXT;
