import {
  Controller,
  Get,
  Post,
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
} from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { TaskService } from '../task/task.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { TaskQueryDto } from '../task/dto/task-query.dto';
import { IterationService } from '../iteration/iteration.service';
import { CreateIterationDto } from '../iteration/dto/create-iteration.dto';
import { MilestoneService } from './milestone.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly taskService: TaskService,
    private readonly iterationService: IterationService,
    private readonly milestoneService: MilestoneService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createProjectDto: CreateProjectDto, @CurrentUser() user: any) {
    return this.projectService.create(createProjectDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects' })
  @ApiResponse({ status: 200, description: 'Returns list of projects' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() query: ProjectQueryDto, @CurrentUser() user: any) {
    return this.projectService.findAll(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Returns project details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectService.findOne(id, user.id);
  }

  @Get(':projectId/dashboard-summary')
  @ApiOperation({ summary: 'Get project dashboard summary' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns project dashboard summary',
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
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
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
  @ApiResponse({ status: 200, description: 'Project archived successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  archive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectService.archive(id, user.id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore archived project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project restored successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  restore(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectService.restore(id, user.id);
  }

  @Get(':projectId/tasks')
  @ApiOperation({ summary: 'Get tasks for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Returns list of tasks' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProjectTasks(
    @Param('projectId') projectId: string,
    @Query() query: TaskQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.taskService.findAll(projectId, query, user.id);
  }

  @Get(':projectId/iterations')
  @ApiOperation({ summary: 'Get iterations for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Returns list of iterations' })
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
  @ApiResponse({ status: 201, description: 'Iteration created successfully' })
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
  @ApiResponse({ status: 200, description: 'Returns list of milestones' })
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
  @ApiResponse({ status: 201, description: 'Milestone created successfully' })
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
  getExternalLinks(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectService.getExternalLinks(projectId, user.id);
  }

  @Post(':projectId/external-links')
  @ApiOperation({ summary: 'Add external project link' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
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
  getDocLinks(@Param('projectId') projectId: string, @CurrentUser() user: any) {
    return this.projectService.getDocLinks(projectId, user.id);
  }

  @Post(':projectId/doc-links')
  @ApiOperation({ summary: 'Add document link' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
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
  getApiDocLinks(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectService.getApiDocLinks(projectId, user.id);
  }

  @Post(':projectId/api-doc-links')
  @ApiOperation({ summary: 'Add API doc link' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
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
  getAIContext(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectService.getAIContext(projectId, user.id);
  }

  @Post(':projectId/ai-context/refresh')
  @ApiOperation({ summary: 'Refresh AI context' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  refreshAIContext(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectService.refreshAIContext(projectId, user.id);
  }
}
