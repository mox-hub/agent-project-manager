/**
 * Metadata Module (DEPRECATED - Phase 2)
 * 此模块已废弃，计划并入 Core 模块。
 * 废弃时间: 2026-07-18 (v2.1.0)
 * 替代: 将来的 Core 模块元数据管理
 * TODO: Phase 2 合并到 apps/server/src/core/
 * @deprecated Phase 2 实现 Core 增强时合并
 */

import { Module } from '@nestjs/common';
import { MetadataService } from './metadata.service';
import { MetadataController } from './metadata.controller';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [MetadataController],
  providers: [MetadataService, RolesGuard],
  exports: [MetadataService],
})
export class MetadataModule {}
