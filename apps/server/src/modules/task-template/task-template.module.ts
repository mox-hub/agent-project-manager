/**
 * Task Template Module (DEPRECATED - Phase 2+)
 *
 * 此模块已废弃，Phase 2 暂停开发。
 *
 * 废弃时间: 2026-07-18 (v2.1.0)
 * 状态: Phase 2 候选功能
 *
 * @deprecated Phase 2 考虑实现
 */

import { Module } from '@nestjs/common';
import { TaskTemplateController } from './task-template.controller';
import { TaskTemplateService } from './task-template.service';

@Module({
  controllers: [TaskTemplateController],
  providers: [TaskTemplateService],
  exports: [TaskTemplateService],
})
export class TaskTemplateModule {}
