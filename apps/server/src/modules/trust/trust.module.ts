/**
 * Trust Module (DEPRECATED - Phase 2)
 * 
 * 此模块已废弃，计划并入 AI Hub 模块。
 * 
 * 废弃时间: 2026-07-18 (v2.1.0)
 * 替代: 将来的 AI Hub 信任模型
 * 
 * 计划: Phase 2 合并到 apps/server/src/modules/ai-hub/
 * 
 * @deprecated Phase 2 实现 AI Hub 时合并
 */

import { Module } from '@nestjs/common';
import { TrustService } from './trust.service';

@Module({
  providers: [TrustService],
  exports: [TrustService],
})
export class TrustModule {}
