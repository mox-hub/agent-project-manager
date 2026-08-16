import { Module } from '@nestjs/common';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { TaskIdService } from './services/task-id.service';
import { TaskIdManagementService } from './services/task-id-management.service';

@Module({
  controllers: [TaskController],
  providers: [TaskService, TaskIdService, TaskIdManagementService],
  exports: [TaskService, TaskIdService, TaskIdManagementService],
})
export class TaskModule {}
