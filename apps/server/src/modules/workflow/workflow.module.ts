/**
 * WorkflowModule（CAP-A-11 基座 + CAP-S-03 v2 引擎）——持久执行引擎。
 *
 * 独立于 ai-hub（编排逻辑不进 ai-hub，防 god module），仅复用其
 * AdapterRegistryService 做 llm 步骤的模型接入；run 记账与进度推送
 * 复用 Prisma AIWorkflowRun 表与 message-bus→socket（ai.workflow.update）。
 * v1 = Mastra 编排壳（兼容层只读保留）；v2 = 自研确定性引擎（journal 双层账
 * + 跨重启恢复 + agent 节点经 CliDispatchModule 派发外部工具）。
 */

import { Module } from '@nestjs/common';
import { QuickJudgeModule } from '../ai-hub/quick-judge/quick-judge.module';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { WorkflowCompilerService } from './workflow-compiler.service';
import { WorkflowV2EngineService } from './workflow-v2.engine.service';
import { AiHubModule } from '../ai-hub/ai-hub.module';
import { CliDispatchModule } from '../cli-dispatch/cli-dispatch.module';
import { MessageBusModule } from '../../core/message-bus/message-bus.module';

@Module({
  imports: [AiHubModule, CliDispatchModule, MessageBusModule, QuickJudgeModule],
  controllers: [WorkflowController],
  providers: [
    WorkflowService,
    WorkflowCompilerService,
    WorkflowV2EngineService,
  ],
  exports: [WorkflowService],
})
export class WorkflowModule {}
