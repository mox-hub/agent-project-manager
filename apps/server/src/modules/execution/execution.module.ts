import { Module } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { ApprovalService } from './approval.service';
import { TaskExecutionBridge } from './task-execution-bridge.service';
import { ExecutionController } from './execution.controller';

@Module({
  providers: [ExecutionService, ApprovalService, TaskExecutionBridge],
  controllers: [ExecutionController],
  exports: [ExecutionService, ApprovalService, TaskExecutionBridge],
})
export class ExecutionModule {}
