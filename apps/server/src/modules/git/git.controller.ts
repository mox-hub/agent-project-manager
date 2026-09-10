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
  ApiOkResponse,
  ApiCreatedResponse,
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
import {
  GitRepositoryResponseDto,
  RepositoryStatusResponseDto,
  CommitPageResponseDto,
  CommitDetailResponseDto,
  DiffSummaryResponseDto,
  PullRequestResponseDto,
  PullRequestDetailResponseDto,
  PullRequestReviewResponseDto,
  GitToolInfoResponseDto,
  ProjectWorkspaceResponseDto,
  WorkspaceValidationResponseDto,
  CloneRepositoryResponseDto,
  GitCommandResultResponseDto,
  GitCommandExecutionResponseDto,
  BranchListResponseDto,
  BranchMutationResultResponseDto,
} from './dto/git-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';

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
  @ApiStandardErrors()
  @ApiOkResponse({
    type: GitRepositoryResponseDto,
    isArray: true,
    description: '仓库列表（含 project 摘要，按创建时间倒序）',
  })
  async getRepositories(
    @Query() query: RepositoryQueryDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getRepositories(query, user.sub);
  }

  @Post('repos')
  @ApiOperation({ summary: '创建仓库' })
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: GitRepositoryResponseDto,
    description: '返回创建后的仓库（含 project 摘要）',
  })
  async createRepository(
    @Body() dto: CreateRepositoryDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.createRepository(dto, user.sub);
  }

  @Get('repos/:repoId')
  @ApiOperation({ summary: '获取仓库详情' })
  @ApiParam({ name: 'repoId', description: '仓库 ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: GitRepositoryResponseDto,
    description: '返回仓库详情（含 project 摘要）',
  })
  async getRepositoryById(
    @Param('repoId') repoId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getRepositoryById(repoId, user.sub);
  }

  @Get('repos/:repoId/status')
  @ApiOperation({ summary: '获取仓库状态' })
  @ApiParam({ name: 'repoId', description: '仓库 ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: RepositoryStatusResponseDto,
    description:
      '工作区状态（clean/ahead/behind/变更文件；本地路径不可用时带 error）',
  })
  async getRepositoryStatus(
    @Param('repoId') repoId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getRepositoryStatus(repoId, user.sub);
  }

  @Get('repos/:repoId/commits')
  @ApiOperation({ summary: '获取提交记录' })
  @ApiParam({ name: 'repoId', description: '仓库 ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: CommitPageResponseDto,
    description:
      '提交分页（{ items, total, page, pageSize }，item 含变更文件）',
  })
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
  @ApiStandardErrors()
  @ApiOkResponse({
    type: CommitDetailResponseDto,
    description: '提交详情（含 repo[project.members] 与变更文件）',
  })
  async getCommitById(
    @Param('commitId') commitId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getCommitById(commitId, user.sub);
  }

  @Post('diff')
  @ApiOperation({ summary: '生成差异' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: DiffSummaryResponseDto,
    description:
      '两 ref 间差异汇总（files/totalAdditions/totalDeletions/totalChanges）',
  })
  async generateDiff(
    @Body() dto: DiffQueryDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.generateDiff(dto, user.sub);
  }

  @Get('repos/:repoId/pull-requests')
  @ApiOperation({ summary: '获取 PR 列表' })
  @ApiParam({ name: 'repoId', description: '仓库 ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: PullRequestResponseDto,
    isArray: true,
    description: 'PR 列表（含 reviews，按更新时间倒序）',
  })
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
  @ApiStandardErrors()
  @ApiOkResponse({
    type: PullRequestDetailResponseDto,
    description: 'PR 详情（含 repo[project.members] 与 reviews）',
  })
  async getPullRequestById(
    @Param('prId') prId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getPullRequestById(prId, user.sub);
  }

  @Post('pull-requests/:prId/reviews')
  @ApiOperation({ summary: '创建 PR 审查' })
  @ApiParam({ name: 'prId', description: 'PR ID' })
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: PullRequestReviewResponseDto,
    description: '返回创建后的审查记录',
  })
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
  @ApiStandardErrors()
  @ApiOkResponse({
    type: GitToolInfoResponseDto,
    description:
      'Git 工具可用性（available/version/path/config/error/suggestion）',
  })
  async checkGitTool(@CurrentUser() _user: { sub: string }) {
    return this.gitTool.checkGitAvailability();
  }

  @Post('tool/path')
  @ApiOperation({ summary: '设置 Git 可执行文件路径' })
  async setGitPath(
    @Body() dto: { gitPath: string },
    @CurrentUser() _user: { sub: string },
  ) {
    await this.gitTool.setGitPath(dto.gitPath);
  }

  // Workspace Management APIs
  @Get('projects/:projectId/workspace')
  @ApiOperation({ summary: '获取项目工作空间' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ProjectWorkspaceResponseDto,
    description: '项目工作空间配置（不存在时自动创建默认记录）',
  })
  async getWorkspace(
    @Param('projectId') projectId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.workspace.getWorkspace(projectId, user.sub);
  }

  @Put('projects/:projectId/workspace')
  @ApiOperation({ summary: '设置项目工作空间' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ProjectWorkspaceResponseDto,
    description: '返回 upsert 后的工作空间配置',
  })
  async setWorkspace(
    @Param('projectId') projectId: string,
    @CurrentUser() user: { sub: string },
    @Body()
    dto: {
      localPath?: string;
      remoteUrl?: string;
      autoClone?: boolean;
    },
  ) {
    return this.workspace.setWorkspace(projectId, user.sub, dto);
  }

  @Post('projects/:projectId/workspace/validate')
  @ApiOperation({ summary: '验证项目工作空间' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: WorkspaceValidationResponseDto,
    description: '校验结果（valid/status/error/suggestion/gitRepoDetected）',
  })
  async validateWorkspace(
    @Param('projectId') projectId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.workspace.validateWorkspace(projectId, user.sub);
  }

  @Post('projects/:projectId/workspace/clone')
  @ApiOperation({ summary: '克隆仓库到项目工作空间' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: CloneRepositoryResponseDto,
    description: '克隆结果（{ success, message, stdout, stderr }）',
  })
  async cloneRepository(
    @Param('projectId') projectId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: { remoteUrl: string; localPath: string },
  ) {
    return this.workspace.cloneRepository(projectId, user.sub, dto);
  }

  // Git Command Execution APIs
  @Post('repos/:repoId/commands/execute')
  @ApiOperation({ summary: '执行 Git 命令' })
  @ApiParam({ name: 'repoId', description: '仓库 ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: GitCommandResultResponseDto,
    description:
      '命令执行结果（工作区缺失/危险命令等前置校验失败也返回同结构 success=false）',
  })
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
  @ApiStandardErrors()
  @ApiOkResponse({
    type: GitCommandExecutionResponseDto,
    isArray: true,
    description: '命令执行历史（按执行时间倒序，默认最近 50 条）',
  })
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
  @ApiStandardErrors()
  @ApiOkResponse({
    type: BranchListResponseDto,
    description: '分支列表（local 含 tracking，remote 仅 includeRemote=true）',
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
  @ApiStandardErrors()
  @ApiOkResponse({
    type: BranchMutationResultResponseDto,
    description: '返回 { success, branch }',
  })
  async createBranch(
    @Param('repoId') repoId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: { name: string; from?: string; checkout?: boolean },
  ) {
    const repo = await this.gitService.getRepositoryById(repoId, user.sub);
    return this.gitService.createBranch(repo.id, user.sub, dto);
  }

  @Delete('repos/:repoId/branches/:branchName')
  @ApiOperation({ summary: '删除分支' })
  @ApiParam({ name: 'repoId', description: '仓库 ID' })
  @ApiParam({ name: 'branchName', description: '分支名' })
  @ApiQuery({ name: 'force', required: false, description: '是否强制删除' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: BranchMutationResultResponseDto,
    description: '返回 { success, branch }',
  })
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
  @ApiStandardErrors()
  @ApiOkResponse({
    type: BranchMutationResultResponseDto,
    description: '返回 { success, branch }',
  })
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
  @ApiStandardErrors()
  @ApiOkResponse({
    type: DiffSummaryResponseDto,
    description: '工作区 vs HEAD 差异汇总',
  })
  async getWorkingDiff(
    @Param('repoId') repoId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getWorkingDiff(repoId, user.sub);
  }

  @Get('repos/:repoId/diff/staged')
  @ApiOperation({ summary: '获取暂存区差异' })
  @ApiParam({ name: 'repoId', description: '仓库 ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: DiffSummaryResponseDto,
    description: '暂存区 vs HEAD 差异汇总',
  })
  async getStagedDiff(
    @Param('repoId') repoId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getStagedDiff(repoId, user.sub);
  }
}
