import { Module } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { ExecutionReconcileService } from './execution-reconcile.service';
import { ApprovalService } from './approval.service';
import { ExecutionController } from './execution.controller';
import { DecisionModule } from '@/modules/decision/decision.module';
import { RuntimeModule } from '@/modules/runtime/runtime.module';
import { WorkflowModule } from '@/modules/workflow/workflow.module';

@Module({
  // RuntimeModule：对账服务判活（心跳离线 → 悬挂收敛）依赖 RuntimeService
  imports: [DecisionModule, RuntimeModule, WorkflowModule],
  providers: [ExecutionService, ExecutionReconcileService, ApprovalService],
  controllers: [ExecutionController],
  exports: [ExecutionService, ApprovalService],
})
export class ExecutionModule {}
