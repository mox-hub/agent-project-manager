import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { CreateTaskDependencyDto } from './dto/create-task-dependency.dto';
import { ImportTasksDto, ExportFormat } from './dto/import-export.dto';
import {
  ClaimTaskDto,
  AiSuggestionDto,
  AiExecutionResultDto,
  AiDiscoverQueryDto,
} from './dto/claim-task.dto';
import type { Response } from 'express';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createTaskDto: CreateTaskDto, @CurrentUser() user: any) {
    return this.taskService.create(createTaskDto, user.id);
  }

  @Get('bugs')
  @ApiOperation({ summary: 'Get all bugs across projects' })
  @ApiResponse({ status: 200, description: 'Returns all bugs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAllBugs(@Query() query: any, @CurrentUser() user: any) {
    return this.taskService.findAllBugs(query, user.id);
  }

  /**
   * 跨项目查询所有 task + bug, 默认包含 task 类型。
   * 用于全局任务管理页面 (TasksPage), 同时返回未绑定项目的任务 (inbox)
   */
  @Get('all')
  @ApiOperation({ summary: 'Get all tasks and bugs across projects' })
  @ApiQuery({ name: 'type', required: false, enum: ['task', 'bug', 'all'] })
  @ApiResponse({ status: 200, description: 'Returns all tasks and bugs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAllTasks(@Query() query: any, @CurrentUser() user: any) {
    return this.taskService.findAllTasks(query, user.id);
  }

  /**
   * 跨项目查询当前用户有权限访问的 task/bug
   * 主要供文档/段落关联面板使用 - 即便文档没绑定 project 也能拿到可选清单
   */
  @Get('accessible')
  @ApiOperation({ summary: 'Get tasks and bugs accessible to current user (cross-project)' })
  @ApiResponse({ status: 200, description: 'Returns accessible tasks and bugs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAccessibleTasks(@Query() query: any, @CurrentUser() user: any) {
    return this.taskService.findAccessibleTasks(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Returns task details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.taskService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: any,
  ) {
    return this.taskService.update(id, updateTaskDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.taskService.delete(id, user.id);
  }

  @Post(':id/dependencies')
  @ApiOperation({ summary: 'Add task dependency' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 201, description: 'Dependency added successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  addDependency(
    @Param('id') id: string,
    @Body() dto: CreateTaskDependencyDto,
    @CurrentUser() user: any,
  ) {
    return this.taskService.addDependency(id, dto, user.id);
  }

  @Delete(':id/dependencies/:dependencyId')
  @ApiOperation({ summary: 'Remove task dependency' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiParam({ name: 'dependencyId', description: 'Dependency ID' })
  @ApiResponse({ status: 200, description: 'Dependency removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  removeDependency(
    @Param('id') id: string,
    @Param('dependencyId') dependencyId: string,
    @CurrentUser() user: any,
  ) {
    return this.taskService.removeDependency(id, dependencyId, user.id);
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get task activities' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Returns task activities' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getActivities(@Param('id') id: string, @CurrentUser() user: any) {
    return this.taskService.getActivities(id, user.id);
  }

  // ─── AI Worker Endpoints ──────────────────────────────────────────

  @Post(':id/claim')
  @ApiOperation({ summary: 'AI agent claims a task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task claimed by AI agent' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  claimForAi(
    @Param('id') id: string,
    @Body() dto: ClaimTaskDto,
    @CurrentUser() user: any,
  ) {
    return this.taskService.claimForAi(id, dto, user.id);
  }

  @Post(':id/ai-suggestion')
  @ApiOperation({ summary: 'Submit AI suggestion for a task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'AI suggestion submitted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  submitAiSuggestion(
    @Param('id') id: string,
    @Body() dto: AiSuggestionDto,
    @CurrentUser() user: any,
  ) {
    return this.taskService.submitAiSuggestion(id, dto, user.id);
  }

  @Post(':id/ai-execution-result')
  @ApiOperation({ summary: 'Submit AI execution result' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'AI execution result submitted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  submitAiExecutionResult(
    @Param('id') id: string,
    @Body() dto: AiExecutionResultDto,
    @CurrentUser() user: any,
  ) {
    return this.taskService.submitAiExecutionResult(id, dto, user.id);
  }

  @Get('ai-discoverable')
  @ApiOperation({ summary: 'Find tasks discoverable by AI agents' })
  @ApiQuery({ name: 'projectId', required: true, description: 'Project ID' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: ['low', 'medium', 'high', 'critical'],
  })
  @ApiResponse({ status: 200, description: 'Returns discoverable tasks' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAiDiscoverable(
    @Query() query: AiDiscoverQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.taskService.findAiDiscoverableTasks(query, user.id);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import tasks from CSV/JSON' })
  @ApiResponse({ status: 201, description: 'Tasks imported successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  importTasks(@Body() dto: ImportTasksDto, @CurrentUser() user: any) {
    return this.taskService.importTasks(dto.tasks, user.id);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export tasks to CSV/JSON' })
  @ApiQuery({ name: 'projectId', required: true, description: 'Project ID' })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ExportFormat,
    description: 'Export format',
  })
  @ApiResponse({ status: 200, description: 'Returns exported tasks' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportTasks(
    @Query('projectId') projectId: string,
    @Query('format') format: ExportFormat = ExportFormat.CSV,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const data = await this.taskService.exportTasks(projectId, user.id, format);

    if (format === ExportFormat.JSON) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=tasks.json');
      return res.status(HttpStatus.OK).json(data);
    }

    // CSV format
    const csv = this.taskService.convertToCSV(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=tasks.csv');
    return res.status(HttpStatus.OK).send(csv);
  }
}
