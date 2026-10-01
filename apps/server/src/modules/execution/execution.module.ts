import { Module } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { ExecutionReconcileService } from './execution-reconcile.service';
import { ApprovalService } from './approval.service';
import { ExecutionController } from './execution.controller';
import { DecisionModule } from '@/modules/decision/decision.module';
import { ExecutionWorktreeModule } from '@/modules/git/execution-worktree.module';

@Module({
  imports: [DecisionModule, ExecutionWorktreeModule],
  providers: [ExecutionService, ExecutionReconcileService, ApprovalService],
  controllers: [ExecutionController],
  exports: [ExecutionService, ApprovalService],
})
export class ExecutionModule {}
