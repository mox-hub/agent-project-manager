/**
 * WorkflowModule（CAP-A-11）——持久执行引擎基座。
 *
 * 独立于 ai-hub（编排逻辑不进 ai-hub，防 god module），仅复用其
 * AdapterRegistryService 做 llm 步骤的模型接入；run 记账与进度推送
 * 复用 Prisma AIWorkflowRun 表与 message-bus→socket（ai.workflow.update）。
 */

import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { WorkflowCompilerService } from './workflow-compiler.service';
import { AiHubModule } from '../ai-hub/ai-hub.module';
import { MessageBusModule } from '../../core/message-bus/message-bus.module';

@Module({
  imports: [AiHubModule, MessageBusModule],
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowCompilerService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
