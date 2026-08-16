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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Git')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('git')
export class GitController {
  constructor(
    private readonly gitService: GitService,
    private readonly gitTool: GitToolService,
    private readonly workspace: ProjectWorkspaceService,
    private readonly gitCommand: GitCommandService,
  ) {}

  @Get('repos')
  @ApiOperation({ summary: '获取仓库列表' })
  async getRepositories(
    @Query() query: RepositoryQueryDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getRepositories(query, user.sub);
  }

  @Post('repos')
  @ApiOperation({ summary: '创建仓库' })
  async createRepository(
    @Body() dto: CreateRepositoryDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.createRepository(dto, user.sub);
  }

  @Get('repos/:repoId')
  @ApiOperation({ summary: '获取仓库详情' })
  @ApiParam({ name: 'repoId', description: '仓库 ID' })
  async getRepositoryById(
    @Param('repoId') repoId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getRepositoryById(repoId, user.sub);
  }

  @Get('repos/:repoId/status')
  @ApiOperation({ summary: '获取仓库状态' })
  @ApiParam({ name: 'repoId', description: '仓库 ID' })
  async getRepositoryStatus(
    @Param('repoId') repoId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getRepositoryStatus(repoId, user.sub);
  }

  @Get('repos/:repoId/commits')
  @ApiOperation({ summary: '获取提交记录' })
  @ApiParam({ name: 'repoId', description: '仓库 ID' })
  async getCommits(
    @Param('repoId') repoId: string,
    @Query() query: CommitQueryDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getCommits(repoId, query, user.sub);
  }

  @Get('commits/:commitId')
  @ApiOperation({ summary: '获取提交详情' })
  @ApiParam({ name: 'commitId', description: '提交 ID' })
  async getCommitById(
    @Param('commitId') commitId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getCommitById(commitId, user.sub);
  }

  @Post('diff')
  @ApiOperation({ summary: '生成差异' })
  async generateDiff(
    @Body() dto: DiffQueryDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.generateDiff(dto, user.sub);
  }

  @Get('repos/:repoId/pull-requests')
  @ApiOperation({ summary: '获取 PR 列表' })
  @ApiParam({ name: 'repoId', description: '仓库 ID' })
  async getPullRequests(
    @Param('repoId') repoId: string,
    @Query() query: PullRequestQueryDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getPullRequests(repoId, query, user.sub);
  }

  @Get('pull-requests/:prId')
  @ApiOperation({ summary: '获取 PR 详情' })
  @ApiParam({ name: 'prId', description: 'PR ID' })
  async getPullRequestById(
    @Param('prId') prId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getPullRequestById(prId, user.sub);
  }

  @Post('pull-requests/:prId/reviews')
  @ApiOperation({ summary: '创建 PR 审查' })
  @ApiParam({ name: 'prId', description: 'PR ID' })
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
  @ApiOperation({ summary: '检查 Git 工具可用性' })
  async checkGitTool(@CurrentUser() user: { sub: string }) {
    return this.gitTool.checkGitAvailability();
  }

  @Post('tool/path')
  @ApiOperation({ summary: '设置 Git 可执行文件路径' })
  async setGitPath(
    @Body() dto: { gitPath: string },
    @CurrentUser() user: { sub: string },
  ) {
    await this.gitTool.setGitPath(dto.gitPath);
  }

  // Workspace Management APIs
  @Get('projects/:projectId/workspace')
  @ApiOperation({ summary: '获取项目工作空间' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  async getWorkspace(
    @Param('projectId') projectId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.workspace.getWorkspace(projectId, user.sub);
  }

  @Put('projects/:projectId/workspace')
  @ApiOperation({ summary: '设置项目工作空间' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
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
  @ApiOperation({ summary: '验证项目工作空间' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  async validateWorkspace(
    @Param('projectId') projectId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.workspace.validateWorkspace(projectId, user.sub);
  }

  @Post('projects/:projectId/workspace/clone')
  @ApiOperation({ summary: '克隆仓库到项目工作空间' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  async cloneRepository(
    @Param('projectId') projectId: string,
    @Body() dto: { remoteUrl: string; localPath: string },
    @CurrentUser() user: { sub: string },
  ) {
    return this.workspace.cloneRepository(projectId, user.sub, dto);
  }

  // Git Command Execution APIs
  @Post('repos/:repoId/commands/execute')
  @ApiOperation({ summary: '执行 Git 命令' })
  @ApiParam({ name: 'repoId', description: '仓库 ID' })
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
    const repo = await this.gitService.getRepositoryById(repoId, user.sub);
    const workspace = await this.workspace.getWorkspace(
      repo.projectId,
      user.sub,
    );

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

    const validation = await this.workspace.validateWorkspace(
      repo.projectId,
      user.sub,
    );
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
  @ApiOperation({ summary: '获取 Git 命令执行历史' })
  @ApiParam({ name: 'repoId', description: '仓库 ID' })
  @ApiQuery({ name: 'limit', required: false, description: '返回条数限制' })
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
  @ApiOperation({ summary: '获取分支列表' })
  @ApiParam({ name: 'repoId', description: '仓库 ID' })
  @ApiQuery({
    name: 'includeRemote',
    required: false,
    description: '是否包含远程分支',
  })
  async getBranches(
    @Param('repoId') repoId: string,
    @CurrentUser() user: { sub: string },
    @Query('includeRemote') includeRemote?: boolean,
  ) {
    const repo = await this.gitService.getRepositoryById(repoId, user.sub);
    return this.gitService.getBranches(repo.id, user.sub, includeRemote);
  }

  @Post('repos/:repoId/branches')
  @ApiOperation({ summary: '创建分支' })
  @ApiParam({ name: 'repoId', description: '仓库 ID' })
  async createBranch(
    @Param('repoId') repoId: string,
    @Body() dto: { name: string; from?: string; checkout?: boolean },
    @CurrentUser() user: { sub: string },
  ) {
    const repo = await this.gitService.getRepositoryById(repoId, user.sub);
    return this.gitService.createBranch(repo.id, user.sub, dto);
  }

  @Delete('repos/:repoId/branches/:branchName')
  @ApiOperation({ summary: '删除分支' })
  @ApiParam({ name: 'repoId', description: '仓库 ID' })
  @ApiParam({ name: 'branchName', description: '分支名' })
  @ApiQuery({ name: 'force', required: false, description: '是否强制删除' })
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
  @ApiOperation({ summary: '检出分支' })
  @ApiParam({ name: 'repoId', description: '仓库 ID' })
  @ApiParam({ name: 'branchName', description: '分支名' })
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
  @ApiOperation({ summary: '获取工作区差异' })
  @ApiParam({ name: 'repoId', description: '仓库 ID' })
  async getWorkingDiff(
    @Param('repoId') repoId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getWorkingDiff(repoId, user.sub);
  }

  @Get('repos/:repoId/diff/staged')
  @ApiOperation({ summary: '获取暂存区差异' })
  @ApiParam({ name: 'repoId', description: '仓库 ID' })
  async getStagedDiff(
    @Param('repoId') repoId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getStagedDiff(repoId, user.sub);
  }
}
