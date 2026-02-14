import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
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
}
