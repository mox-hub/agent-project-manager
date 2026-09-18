/**
 * Context Module (DEPRECATED)
 *
 * 此模块已废弃，功能并入 AI Hub 模块。
 *
 * 废弃时间: 2026-07-18 (v2.1.0)
 * 替代: 通过 AiHubService 的 ContextBuilderService 访问
 *
 * 计划: Phase 2 将合并到 apps/server/src/modules/ai-hub/
 *
 * @deprecated 使用 AiHubModule 中的 ContextBuilderService
 */

import { Module } from '@nestjs/common';
import { ContextService, CONTEXT_CLOCK } from './context.service';

/** 判龄时钟的生产实现：系统时间（测试可覆盖为固定时钟） */
export const CONTEXT_CLOCK_PROVIDER = {
  provide: CONTEXT_CLOCK,
  useValue: (): Date => new Date(),
};

@Module({
  providers: [CONTEXT_CLOCK_PROVIDER, ContextService],
  exports: [ContextService],
})
export class ContextModule {}
