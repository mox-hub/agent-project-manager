import { Module } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { ApprovalService } from './approval.service';
import { ExecutionController } from './execution.controller';
import { DecisionModule } from '@/modules/decision/decision.module';

@Module({
  imports: [DecisionModule],
  providers: [ExecutionService, ApprovalService],
  controllers: [ExecutionController],
  exports: [ExecutionService, ApprovalService],
})
export class ExecutionModule {}
