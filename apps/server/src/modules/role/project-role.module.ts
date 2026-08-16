import { Module } from '@nestjs/common';
import { ProjectRoleDefinitionService } from './project-role.service';
import { ProjectRoleDefinitionController } from './project-role.controller';

@Module({
  controllers: [ProjectRoleDefinitionController],
  providers: [ProjectRoleDefinitionService],
  exports: [ProjectRoleDefinitionService],
})
export class ProjectRoleModule {}
