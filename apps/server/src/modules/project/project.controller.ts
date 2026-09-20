import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { IssueService } from '../issue/issue.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { IssueQueryDto } from '../issue/dto/issue-query.dto';
import {
  ProjectResponseDto,
  ProjectDetailResponseDto,
  ProjectPageResponseDto,
  ProjectDashboardSummaryResponseDto,
  ProjectIssuePageResponseDto,
  IterationResponseDto,
  MilestoneResponseDto,
  MilestoneSummaryResponseDto,
  ExternalProjectLinkResponseDto,
  ProjectDocLinkResponseDto,
  ProjectHealthSnapshotResponseDto,
  ProjectAIContextResponseDto,
} from './dto/project-response.dto';
import { IterationService } from '../iteration/iteration.service';
import { CreateIterationDto } from '../iteration/dto/create-iteration.dto';
import { MilestoneService } from './milestone.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly issueService: IssueService,
    private readonly iterationService: IterationService,
    private readonly milestoneService: MilestoneService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: ProjectDetailResponseDto,
    description: '返回创建后的项目（含 members/owner）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createProjectDto: CreateProjectDto, @CurrentUser() user: any) {
    return this.projectService.create(createProjectDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ProjectPageResponseDto,
    description:
      '项目分页列表（{ items, total, page, pageSize, totalPages }，item 含 teams 拼装）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() query: ProjectQueryDto, @CurrentUser() user: any) {
    return this.projectService.findAll(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ProjectDetailResponseDto,
    description: '项目详情（members/owner/_count + teams 拼装）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectService.findOne(id, user.id);
  }

  @Get(':projectId/dashboard-summary')
  @ApiOperation({ summary: 'Get project dashboard summary' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ProjectDashboardSummaryResponseDto,
    description:
      '仪表盘聚合：projectMeta / taskStats / boardPreview / health / ai / teamWorkload / analytics / activityFeed / milestones / iterations / integrations',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  getDashboardSummary(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectService.getDashboardSummary(projectId, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ProjectDetailResponseDto,
    description: '返回更新后的项目（含 members/owner）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() user: any,
  ) {
    return this.projectService.update(id, updateProjectDto, user.id);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiStandardErrors()
  @ApiOkResponse({ type: ProjectResponseDto, description: '返回归档后的项目' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  archive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectService.archive(id, user.id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore archived project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiStandardErrors()
  @ApiOkResponse({ type: ProjectResponseDto, description: '返回恢复后的项目' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  restore(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectService.restore(id, user.id);
  }

  @Post(':id/sync/unbind')
  @ApiOperation({
    summary: '解绑外部同步：清除全部外链字段回 local（不可恢复）',
  })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ProjectResponseDto,
    description: '返回解绑后的项目（外链字段已清空）',
  })
  @ApiResponse({
    status: 400,
    description: 'Project is not bound to an external sync source',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  unbindSync(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectService.unbindExternalSync(id, user.id);
  }

  @Put(':id/docs-storage')
  @ApiOperation({ summary: '设置项目的文档 Git 仓库路径' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ProjectDetailResponseDto,
    description: '返回更新后的项目（含 members/owner）',
  })
  setDocsStorage(
    @Param('id') id: string,
    @Body() dto: { repoPath: string | null },
    @CurrentUser() user: any,
  ) {
    return this.projectService.update(
      id,
      { documentsRepoPath: dto.repoPath } as any,
      user.id,
    );
  }

  @Get(':projectId/issues')
  @ApiOperation({ summary: 'Get tasks for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ProjectIssuePageResponseDto,
    description:
      '项目工单分页列表（{ data, meta }，含 milestone/aiAgent 预加载）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProjectTasks(
    @Param('projectId') projectId: string,
    @Query() query: IssueQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.issueService.findAll(projectId, query, user.id);
  }

  @Get(':projectId/bugs')
  @ApiOperation({ summary: 'Get bugs for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ProjectIssuePageResponseDto,
    description:
      '项目 bug 分页列表（{ data, meta }，含 milestoneTasks/aiAgent 预加载）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProjectBugs(
    @Param('projectId') projectId: string,
    @Query() query: IssueQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.issueService.findBugs(projectId, query, user.id);
  }

  @Get(':projectId/iterations')
  @ApiOperation({ summary: 'Get iterations for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: IterationResponseDto,
    isArray: true,
    description: '迭代列表（按开始日期倒序，含 _count.issues）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProjectIterations(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.iterationService.findAll(projectId, user.id);
  }

  @Post(':projectId/iterations')
  @ApiOperation({ summary: 'Create iteration for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: IterationResponseDto,
    description: '返回创建后的迭代',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createIteration(
    @Param('projectId') projectId: string,
    @Body() createIterationDto: CreateIterationDto,
    @CurrentUser() user: any,
  ) {
    return this.iterationService.create(
      { ...createIterationDto, projectId },
      user.id,
    );
  }

  @Get(':projectId/milestones')
  @ApiOperation({ summary: 'Get milestones for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: MilestoneSummaryResponseDto,
    isArray: true,
    description: '里程碑列表（含 taskCount 与关联任务摘要，按目标日期升序）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProjectMilestones(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.milestoneService.findAll(projectId, user.id);
  }

  @Post(':projectId/milestones')
  @ApiOperation({ summary: 'Create milestone for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: MilestoneResponseDto,
    description: '返回创建后的里程碑',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createProjectMilestone(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      name: string;
      description?: string;
      targetDate?: string | null;
      iterationId?: string | null;
      status?: string;
      metadata?: Record<string, any>;
    },
    @CurrentUser() user: any,
  ) {
    return this.milestoneService.create(projectId, body, user.id);
  }

  // External Project Links
  @Get(':projectId/external-links')
  @ApiOperation({ summary: 'Get external project links' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ExternalProjectLinkResponseDto,
    isArray: true,
    description: '外部项目链接列表（按创建时间倒序）',
  })
  getExternalLinks(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectService.getExternalLinks(projectId, user.id);
  }

  @Post(':projectId/external-links')
  @ApiOperation({ summary: 'Add external project link' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: ExternalProjectLinkResponseDto,
    description: '返回新建的外部项目链接',
  })
  addExternalLink(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      provider: string;
      externalProjectId: string;
      externalProjectUrl: string;
      syncConfig?: Prisma.JsonObject;
    },
    @CurrentUser() user: any,
  ) {
    return this.projectService.addExternalLink(projectId, user.id, body);
  }

  @Patch(':projectId/external-links/:linkId')
  @ApiOperation({ summary: 'Update external project link' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'linkId', description: 'Link ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ExternalProjectLinkResponseDto,
    description: '返回更新后的外部项目链接',
  })
  updateExternalLink(
    @Param('projectId') projectId: string,
    @Param('linkId') linkId: string,
    @Body()
    body: {
      provider?: string;
      externalProjectId?: string;
      externalProjectUrl?: string;
      syncConfig?: Prisma.JsonObject;
      syncStatus?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.projectService.updateExternalLink(
      projectId,
      user.id,
      linkId,
      body,
    );
  }

  @Delete(':projectId/external-links/:linkId')
  @ApiOperation({ summary: 'Delete external project link' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'linkId', description: 'Link ID' })
  deleteExternalLink(
    @Param('projectId') projectId: string,
    @Param('linkId') linkId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectService.deleteExternalLink(projectId, user.id, linkId);
  }

  // Document Links
  @Get(':projectId/doc-links')
  @ApiOperation({ summary: 'Get document links' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ProjectDocLinkResponseDto,
    isArray: true,
    description: '文档链接列表（按创建时间倒序）',
  })
  getDocLinks(@Param('projectId') projectId: string, @CurrentUser() user: any) {
    return this.projectService.getDocLinks(projectId, user.id);
  }

  @Post(':projectId/doc-links')
  @ApiOperation({ summary: 'Add document link' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: ProjectDocLinkResponseDto,
    description: '返回新建的文档链接',
  })
  addDocLink(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      label: string;
      url: string;
      type: string;
      description?: string;
      aiIndexed?: boolean;
    },
    @CurrentUser() user: any,
  ) {
    return this.projectService.addDocLink(projectId, user.id, body);
  }

  @Patch(':projectId/doc-links/:linkId')
  @ApiOperation({ summary: 'Update document link' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'linkId', description: 'Link ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ProjectDocLinkResponseDto,
    description: '返回更新后的文档链接',
  })
  updateDocLink(
    @Param('projectId') projectId: string,
    @Param('linkId') linkId: string,
    @Body()
    body: Partial<{
      label: string;
      url: string;
      type: string;
      description: string;
      aiIndexed: boolean;
    }>,
    @CurrentUser() user: any,
  ) {
    return this.projectService.updateDocLink(projectId, user.id, linkId, body);
  }

  @Delete(':projectId/doc-links/:linkId')
  @ApiOperation({ summary: 'Delete document link' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'linkId', description: 'Link ID' })
  deleteDocLink(
    @Param('projectId') projectId: string,
    @Param('linkId') linkId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectService.deleteDocLink(projectId, user.id, linkId);
  }

  // API Doc Links
  @Get(':projectId/api-doc-links')
  @ApiOperation({ summary: 'Get API doc links' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ProjectDocLinkResponseDto,
    isArray: true,
    description: 'API 文档链接列表（与文档链接同构，按创建时间倒序）',
  })
  getApiDocLinks(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectService.getApiDocLinks(projectId, user.id);
  }

  @Post(':projectId/api-doc-links')
  @ApiOperation({ summary: 'Add API doc link' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: ProjectDocLinkResponseDto,
    description: '返回新建的 API 文档链接',
  })
  addApiDocLink(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      label: string;
      url: string;
      type: string;
      description?: string;
      aiIndexed?: boolean;
    },
    @CurrentUser() user: any,
  ) {
    return this.projectService.addApiDocLink(projectId, user.id, body);
  }

  @Patch(':projectId/api-doc-links/:linkId')
  @ApiOperation({ summary: 'Update API doc link' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'linkId', description: 'Link ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ProjectDocLinkResponseDto,
    description: '返回更新后的 API 文档链接',
  })
  updateApiDocLink(
    @Param('projectId') projectId: string,
    @Param('linkId') linkId: string,
    @Body()
    body: Partial<{
      label: string;
      url: string;
      type: string;
      description: string;
      aiIndexed: boolean;
    }>,
    @CurrentUser() user: any,
  ) {
    return this.projectService.updateApiDocLink(
      projectId,
      user.id,
      linkId,
      body,
    );
  }

  @Delete(':projectId/api-doc-links/:linkId')
  @ApiOperation({ summary: 'Delete API doc link' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'linkId', description: 'Link ID' })
  deleteApiDocLink(
    @Param('projectId') projectId: string,
    @Param('linkId') linkId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectService.deleteApiDocLink(projectId, user.id, linkId);
  }

  // Health Snapshots
  @Get(':projectId/health-snapshots')
  @ApiOperation({ summary: 'Get health snapshots' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to fetch',
  })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ProjectHealthSnapshotResponseDto,
    isArray: true,
    description: '健康快照列表（按日期升序，breakdown 为各维度得分明细）',
  })
  getHealthSnapshots(
    @Param('projectId') projectId: string,
    @Query('days') days: string,
    @CurrentUser() user: any,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.projectService.getHealthSnapshots(projectId, user.id, daysNum);
  }

  // AI Context
  @Get(':projectId/ai-context')
  @ApiOperation({ summary: 'Get AI context' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ProjectAIContextResponseDto,
    description: '项目 AI 上下文（未计算时返回 null）',
  })
  getAIContext(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectService.getAIContext(projectId, user.id);
  }

  @Post(':projectId/ai-context/refresh')
  @ApiOperation({ summary: 'Refresh AI context' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ProjectAIContextResponseDto,
    description: '返回重算后的 AI 上下文（同时落一份健康快照并更新项目健康分）',
  })
  refreshAIContext(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectService.refreshAIContext(projectId, user.id);
  }
}
