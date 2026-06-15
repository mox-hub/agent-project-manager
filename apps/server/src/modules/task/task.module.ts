import { Module } from '@nestjs/common';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { TaskIdService } from './services/task-id.service';

@Module({
  controllers: [TaskController],
  providers: [TaskService, TaskIdService],
  exports: [TaskService, TaskIdService],
})
export class TaskModule {}
