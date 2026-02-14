import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { TaskModule } from '../task/task.module';
import { IterationModule } from '../iteration/iteration.module';
import { MilestoneService } from './milestone.service';

@Module({
  imports: [TaskModule, IterationModule],
  controllers: [ProjectController],
  providers: [ProjectService, MilestoneService],
  exports: [ProjectService],
})
export class ProjectModule {}
