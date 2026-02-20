import { Module } from '@nestjs/common';
import { GitController } from './git.controller';
import { GitService } from './git.service';
import { GitToolService } from './git-tool.service';
import { ProjectWorkspaceService } from './project-workspace.service';
import { GitCommandService } from './git-command.service';

@Module({
  controllers: [GitController],
  providers: [
    GitService,
    GitToolService,
    ProjectWorkspaceService,
    GitCommandService,
  ],
  exports: [
    GitService,
    GitToolService,
    ProjectWorkspaceService,
    GitCommandService,
  ],
})
export class GitModule {}
