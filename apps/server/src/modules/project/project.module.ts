import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { TaskModule } from '../task/task.module';
import { IterationModule } from '../iteration/iteration.module';

@Module({
  imports: [TaskModule, IterationModule],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
