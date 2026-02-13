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
import { ProjectService } from './project.service';
import { TaskService } from '../task/task.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { TaskQueryDto } from '../task/dto/task-query.dto';
import { IterationService } from '../iteration/iteration.service';
import { CreateIterationDto } from '../iteration/dto/create-iteration.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly taskService: TaskService,
    private readonly iterationService: IterationService,
  ) {}

  @Post()
  create(@Body() createProjectDto: CreateProjectDto, @CurrentUser() user: any) {
    return this.projectService.create(createProjectDto, user.id);
  }

  @Get()
  findAll(@Query() query: ProjectQueryDto, @CurrentUser() user: any) {
    return this.projectService.findAll(query, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() user: any,
  ) {
    return this.projectService.update(id, updateProjectDto, user.id);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectService.archive(id, user.id);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectService.restore(id, user.id);
  }

  @Get(':projectId/tasks')
  getProjectTasks(
    @Param('projectId') projectId: string,
    @Query() query: TaskQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.taskService.findAll(projectId, query, user.id);
  }

  @Get(':projectId/iterations')
  getProjectIterations(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.iterationService.findAll(projectId, user.id);
  }

  @Post(':projectId/iterations')
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
}
