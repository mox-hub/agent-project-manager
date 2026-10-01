import { Module } from '@nestjs/common';
import { GitController } from './git.controller';
import { GitService } from './git.service';
import { GitToolService } from './git-tool.service';
import { ProjectWorkspaceService } from './project-workspace.service';
import { GitCommandService } from './git-command.service';
import { GitHubModule } from '../integration/providers/github/github.module';

// G5-b：ExecutionWorktreeService 走独立的 ExecutionWorktreeModule（零依赖），
// 不挂本模块——本模块链（GitHub→Integration→Linear→Issue）与 decision/
// execution 消费方成环，见 execution-worktree.module.ts 头注。

@Module({
  imports: [GitHubModule],
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
