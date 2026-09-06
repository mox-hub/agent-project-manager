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
import { IssueService } from './issue.service';
import { IssueIdManagementService } from './services/issue-id-management.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateIssueDependencyDto } from './dto/create-issue-dependency.dto';
import { ImportIssuesDto, ExportFormat } from './dto/import-export.dto';
import { AssignIssueAgentDto } from './dto/assign-issue-agent.dto';
import { CreateIssueExecutionDto } from './dto/create-issue-execution.dto';
import { ConfirmIssueExecutionDto } from './dto/confirm-issue-execution.dto';
import type { Response } from 'express';

@ApiTags('Tasks')
@Controller('issues')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class IssueController {
  constructor(
    private readonly issueService: IssueService,
    private readonly issueIdManagementService: IssueIdManagementService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createIssueDto: CreateIssueDto, @CurrentUser() user: any) {
    return this.issueService.create(createIssueDto, user.id);
  }

  @Get('bugs')
  @ApiOperation({ summary: 'Get all bugs across projects' })
  @ApiResponse({ status: 200, description: 'Returns all bugs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAllBugs(@Query() query: any, @CurrentUser() user: any) {
    return this.issueService.findAllBugs(query, user.id);
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
    return this.issueService.findAllTasks(query, user.id);
  }

  /**
   * 通过 shortId 查找任务
   * shortId 格式如 "APM-PF-001"
   */
  @Get('by-short-id/:shortId')
  @ApiOperation({ summary: 'Get task by short ID' })
  @ApiParam({ name: 'shortId', description: 'Short ID (e.g. APM-PF-001)' })
  @ApiResponse({ status: 200, description: 'Returns task details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  findByShortId(@Param('shortId') shortId: string, @CurrentUser() user: any) {
    return this.issueService.findByShortId(shortId, user.id);
  }

  /**
   * 跨项目查询当前用户有权限访问的 task/bug
   * 主要供文档/段落关联面板使用 - 即便文档没绑定 project 也能拿到可选清单
   */
  @Get('accessible')
  @ApiOperation({
    summary: 'Get tasks and bugs accessible to current user (cross-project)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns accessible tasks and bugs',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAccessibleTasks(@Query() query: any, @CurrentUser() user: any) {
    return this.issueService.findAccessibleTasks(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Returns task details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.issueService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  update(
    @Param('id') id: string,
    @Body() updateIssueDto: UpdateIssueDto,
    @CurrentUser() user: any,
  ) {
    return this.issueService.update(id, updateIssueDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.issueService.delete(id, user.id);
  }

  @Post(':id/assign-agent')
  @ApiOperation({ summary: 'Assign an AI agent to the task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'AI agent assigned successfully' })
  assignAgent(
    @Param('id') id: string,
    @Body() dto: AssignIssueAgentDto,
    @CurrentUser() user: any,
  ) {
    return this.issueService.assignAgent(id, dto, user.id);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'List task execution runs' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Returns task execution runs' })
  getExecutions(@Param('id') id: string, @CurrentUser() user: any) {
    return this.issueService.getExecutions(id, user.id);
  }

  @Post(':id/executions')
  @ApiOperation({ summary: 'Create a new AI execution run for the task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 201, description: 'Execution created successfully' })
  createExecution(
    @Param('id') id: string,
    @Body() dto: CreateIssueExecutionDto,
    @CurrentUser() user: any,
  ) {
    return this.issueService.createExecution(id, dto, user.id);
  }

  @Post(':id/executions/:executionId/confirm')
  @ApiOperation({ summary: 'Confirm or reject a pending AI execution' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiParam({ name: 'executionId', description: 'Execution run ID' })
  @ApiResponse({ status: 200, description: 'Execution decision recorded' })
  confirmExecution(
    @Param('id') id: string,
    @Param('executionId') executionId: string,
    @Body() dto: ConfirmIssueExecutionDto,
    @CurrentUser() user: any,
  ) {
    return this.issueService.confirmExecution(id, executionId, dto, user.id);
  }

  @Post(':id/dependencies')
  @ApiOperation({ summary: 'Add task dependency' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 201, description: 'Dependency added successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  addDependency(
    @Param('id') id: string,
    @Body() dto: CreateIssueDependencyDto,
    @CurrentUser() user: any,
  ) {
    return this.issueService.addDependency(id, dto, user.id);
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
    return this.issueService.removeDependency(id, dependencyId, user.id);
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get task activities' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Returns task activities' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getActivities(@Param('id') id: string, @CurrentUser() user: any) {
    return this.issueService.getActivities(id, user.id);
  }

  // ─── AI Execution Endpoints (V3: ExecutionRun) ────────────────────

  @Post('import')
  @ApiOperation({ summary: 'Import tasks from CSV/JSON' })
  @ApiResponse({ status: 201, description: 'Tasks imported successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  importTasks(@Body() dto: ImportIssuesDto, @CurrentUser() user: any) {
    return this.issueService.importTasks(dto.tasks, user.id);
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
    const data = await this.issueService.exportTasks(
      projectId,
      user.id,
      format,
    );

    if (format === ExportFormat.JSON) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=tasks.json');
      return res.status(HttpStatus.OK).json(data);
    }

    // CSV format
    const csv = this.issueService.convertToCSV(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=tasks.csv');
    return res.status(HttpStatus.OK).send(csv);
  }

  // ─── Task ID 管理 ──────────────────────────────────────────

  @Post('admin/backfill-short-ids')
  @ApiOperation({ summary: 'Backfill short IDs for tasks without shortId' })
  @ApiResponse({ status: 200, description: 'Returns backfill result' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async backfillShortIds() {
    const result =
      await this.issueIdManagementService.backfillMissingShortIds();
    return {
      success: result.failed === 0,
      total: result.total,
      successCount: result.success,
      failed: result.failed,
      errors: result.errors,
    };
  }

  @Get('admin/short-id-stats')
  @ApiOperation({ summary: 'Get short ID statistics' })
  @ApiResponse({ status: 200, description: 'Returns short ID stats' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getShortIdStats() {
    return this.issueIdManagementService.getShortIdStats();
  }
}
