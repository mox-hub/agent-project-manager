import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { GitService } from './git.service';
import { GitToolService } from './git-tool.service';
import { ProjectWorkspaceService } from './project-workspace.service';
import { GitCommandService } from './git-command.service';
import { CreateRepositoryDto } from './dto/create-repository.dto';
import {
  RepositoryQueryDto,
  CommitQueryDto,
  DiffQueryDto,
  PullRequestQueryDto,
} from './dto/git-query.dto';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('git')
@UseGuards(JwtAuthGuard)
export class GitController {
  constructor(
    private readonly gitService: GitService,
    private readonly gitTool: GitToolService,
    private readonly workspace: ProjectWorkspaceService,
    private readonly gitCommand: GitCommandService,
  ) {}

  @Get('repos')
  async getRepositories(
    @Query() query: RepositoryQueryDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getRepositories(query, user.sub);
  }

  @Post('repos')
  async createRepository(
    @Body() dto: CreateRepositoryDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.createRepository(dto, user.sub);
  }

  @Get('repos/:repoId')
  async getRepositoryById(
    @Param('repoId') repoId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getRepositoryById(repoId, user.sub);
  }

  @Get('repos/:repoId/status')
  async getRepositoryStatus(
    @Param('repoId') repoId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getRepositoryStatus(repoId, user.sub);
  }

  @Get('repos/:repoId/commits')
  async getCommits(
    @Param('repoId') repoId: string,
    @Query() query: CommitQueryDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getCommits(repoId, query, user.sub);
  }

  @Get('commits/:commitId')
  async getCommitById(
    @Param('commitId') commitId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getCommitById(commitId, user.sub);
  }

  @Post('diff')
  async generateDiff(
    @Body() dto: DiffQueryDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.generateDiff(dto, user.sub);
  }

  @Get('repos/:repoId/pull-requests')
  async getPullRequests(
    @Param('repoId') repoId: string,
    @Query() query: PullRequestQueryDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getPullRequests(repoId, query, user.sub);
  }

  @Get('pull-requests/:prId')
  async getPullRequestById(
    @Param('prId') prId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getPullRequestById(prId, user.sub);
  }

  @Post('pull-requests/:prId/reviews')
  async createPullRequestReview(
    @Param('prId') prId: string,
    @Body()
    dto: {
      type: string;
      state: string;
      summary?: string;
      comments?: any[];
    },
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.createPullRequestReview(prId, dto, user.sub);
  }

  // Git Tool Detection APIs
  @Get('tool/check')
  async checkGitTool(@CurrentUser() user: { sub: string }) {
    return this.gitTool.checkGitAvailability();
  }

  @Post('tool/path')
  async setGitPath(
    @Body() dto: { gitPath: string },
    @CurrentUser() user: { sub: string },
  ) {
    await this.gitTool.setGitPath(dto.gitPath);
    return { success: true };
  }

  // Workspace Management APIs
  @Get('projects/:projectId/workspace')
  async getWorkspace(
    @Param('projectId') projectId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.workspace.getWorkspace(projectId, user.sub);
  }

  @Put('projects/:projectId/workspace')
  async setWorkspace(
    @Param('projectId') projectId: string,
    @Body()
    dto: {
      localPath?: string;
      remoteUrl?: string;
      autoClone?: boolean;
    },
    @CurrentUser() user: { sub: string },
  ) {
    return this.workspace.setWorkspace(projectId, user.sub, dto);
  }

  @Post('projects/:projectId/workspace/validate')
  async validateWorkspace(
    @Param('projectId') projectId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.workspace.validateWorkspace(projectId, user.sub);
  }

  @Post('projects/:projectId/workspace/clone')
  async cloneRepository(
    @Param('projectId') projectId: string,
    @Body() dto: { remoteUrl: string; localPath: string },
    @CurrentUser() user: { sub: string },
  ) {
    return this.workspace.cloneRepository(projectId, user.sub, dto);
  }

  // Git Command Execution APIs
  @Post('repos/:repoId/commands/execute')
  async executeCommand(
    @Param('repoId') repoId: string,
    @Body()
    dto: {
      command: string;
      args?: string[];
      options?: { timeout?: number; allowDangerous?: boolean };
    },
    @CurrentUser() user: { sub: string },
  ) {
    // Get repository to get project ID
    const repo = await this.gitService.getRepositoryById(repoId, user.sub);
    // Get workspace to get local path
    const workspace = await this.workspace.getWorkspace(repo.projectId, user.sub);

    if (!workspace.localPath) {
      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: '',
        duration: 0,
        error: 'WORKSPACE_NOT_FOUND',
        errorMessage: 'No local workspace path configured',
        suggestion: 'Please configure the project workspace path',
      };
    }

    // Validate workspace
    const validation = await this.workspace.validateWorkspace(repo.projectId, user.sub);
    if (!validation.valid) {
      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: validation.error || '',
        duration: 0,
        error: 'GIT_REPO_NOT_FOUND',
        errorMessage: validation.error,
        suggestion: validation.suggestion,
      };
    }

    return this.gitCommand.executeCommand(workspace.localPath, dto);
  }

  @Get('repos/:repoId/commands/history')
  async getCommandHistory(
    @Param('repoId') repoId: string,
    @CurrentUser() user: { sub: string },
    @Query('limit') limit?: number,
  ) {
    return this.gitCommand.getCommandHistory(
      repoId,
      user.sub,
      limit ? parseInt(limit.toString(), 10) : 50,
    );
  }

  // Branch Management APIs
  @Get('repos/:repoId/branches')
  async getBranches(
    @Param('repoId') repoId: string,
    @CurrentUser() user: { sub: string },
    @Query('includeRemote') includeRemote?: boolean,
  ) {
    const repo = await this.gitService.getRepositoryById(repoId, user.sub);
    return this.gitService.getBranches(repo.id, user.sub, includeRemote);
  }

  @Post('repos/:repoId/branches')
  async createBranch(
    @Param('repoId') repoId: string,
    @Body() dto: { name: string; from?: string; checkout?: boolean },
    @CurrentUser() user: { sub: string },
  ) {
    const repo = await this.gitService.getRepositoryById(repoId, user.sub);
    return this.gitService.createBranch(repo.id, user.sub, dto);
  }

  @Delete('repos/:repoId/branches/:branchName')
  async deleteBranch(
    @Param('repoId') repoId: string,
    @Param('branchName') branchName: string,
    @CurrentUser() user: { sub: string },
    @Query('force') force?: boolean,
  ) {
    const repo = await this.gitService.getRepositoryById(repoId, user.sub);
    return this.gitService.deleteBranch(
      repo.id,
      user.sub,
      branchName,
      force === true,
    );
  }

  @Post('repos/:repoId/branches/:branchName/checkout')
  async checkoutBranch(
    @Param('repoId') repoId: string,
    @Param('branchName') branchName: string,
    @CurrentUser() user: { sub: string },
    @Body() dto?: { create?: boolean; from?: string },
  ) {
    const repo = await this.gitService.getRepositoryById(repoId, user.sub);
    return this.gitService.checkoutBranch(repo.id, user.sub, branchName, dto);
  }

  // Enhanced Diff APIs
  @Get('repos/:repoId/diff/working')
  async getWorkingDiff(
    @Param('repoId') repoId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getWorkingDiff(repoId, user.sub);
  }

  @Get('repos/:repoId/diff/staged')
  async getStagedDiff(
    @Param('repoId') repoId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getStagedDiff(repoId, user.sub);
  }
}
