import { Module } from '@nestjs/common';
import { TaskTemplateController } from './task-template.controller';
import { TaskTemplateService } from './task-template.service';

@Module({
  controllers: [TaskTemplateController],
  providers: [TaskTemplateService],
  exports: [TaskTemplateService],
})
export class TaskTemplateModule {}
