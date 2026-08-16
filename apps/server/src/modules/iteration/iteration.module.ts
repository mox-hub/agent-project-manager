/**
 * Iteration Module (DEPRECATED)
 * 
 * 此模块已废弃，功能并入 Project 模块。
 * 
 * 废弃时间: 2026-07-18 (v2.1.0)
 * 替代: 通过 ProjectController 的 /projects/:projectId/iterations 路由访问
 * 
 * 计划: Phase 2 将合并到 apps/server/src/modules/project/
 * 
 * @deprecated 使用 ProjectModule 中的 IterationService
 */

import { Module } from '@nestjs/common';
import { IterationController } from './iteration.controller';
import { IterationService } from './iteration.service';

@Module({
  controllers: [IterationController],
  providers: [IterationService],
  exports: [IterationService],
})
export class IterationModule {}
