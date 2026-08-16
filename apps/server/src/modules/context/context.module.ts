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
import { ContextService } from './context.service';

@Module({
  providers: [ContextService],
  exports: [ContextService],
})
export class ContextModule {}
