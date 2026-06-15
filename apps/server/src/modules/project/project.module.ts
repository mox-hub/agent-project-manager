import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectModuleController } from './controllers/project-module.controller';
import { ProjectService } from './project.service';
import { ProjectModuleService } from './services/project-module.service';
import { TaskModule } from '../task/task.module';
import { IterationModule } from '../iteration/iteration.module';
import { MilestoneService } from './milestone.service';

@Module({
  imports: [TaskModule, IterationModule],
  controllers: [ProjectController, ProjectModuleController],
  providers: [ProjectService, MilestoneService, ProjectModuleService],
  exports: [ProjectService, ProjectModuleService],
})
export class ProjectModule {}
