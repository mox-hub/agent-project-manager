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
  ApiOkResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  getSchemaPath,
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
import {
  IssueDetailResponseDto,
  IssuePageResponseDto,
  ExecutionRunResponseDto,
  ExecutionCreateResponseDto,
  ExecutionConfirmResponseDto,
  IssueDependencyResponseDto,
  IssueActivityResponseDto,
  IssueImportResponseDto,
  IssueExportRowDto,
  ShortIdBackfillResponseDto,
  ShortIdStatsResponseDto,
} from './dto/issue-response.dto';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';
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
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: IssueDetailResponseDto,
    description:
      '返回创建后的任务详情（含 assignee/reporter/标签/依赖/迭代/里程碑/AI 成员）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createIssueDto: CreateIssueDto, @CurrentUser() user: any) {
    return this.issueService.create(createIssueDto, user.id);
  }

  @Get('bugs')
  @ApiOperation({ summary: 'Get all bugs across projects' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: IssuePageResponseDto,
    description:
      '跨项目 bug 分页列表（{ data: Issue[], meta: { page, pageSize, total, totalPages } }）',
  })
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
  @ApiStandardErrors()
  @ApiOkResponse({
    type: IssuePageResponseDto,
    description:
      '跨项目 task+bug 分页列表（{ data, meta }，含 milestone 与 _count）',
  })
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
  @ApiStandardErrors()
  @ApiOkResponse({ type: IssueDetailResponseDto, description: '返回任务详情' })
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
  @ApiStandardErrors()
  @ApiOkResponse({
    type: IssuePageResponseDto,
    description:
      '当前用户可访问的 task/bug 分页列表（{ data, meta }，item 附 project 摘要）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAccessibleTasks(@Query() query: any, @CurrentUser() user: any) {
    return this.issueService.findAccessibleTasks(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiStandardErrors()
  @ApiOkResponse({ type: IssueDetailResponseDto, description: '返回任务详情' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.issueService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: IssueDetailResponseDto,
    description: '返回更新后的任务详情',
  })
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
  @ApiStandardErrors()
  @ApiOkResponse({
    type: IssueDetailResponseDto,
    description: '返回指派后的任务详情（含 aiAgent 摘要）',
  })
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
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ExecutionRunResponseDto,
    isArray: true,
    description: '执行项列表（含 approvals 审批请求，按创建时间倒序）',
  })
  getExecutions(@Param('id') id: string, @CurrentUser() user: any) {
    return this.issueService.getExecutions(id, user.id);
  }

  @Post(':id/executions')
  @ApiOperation({ summary: 'Create a new AI execution run for the task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiStandardErrors()
  @ApiExtraModels(ExecutionRunResponseDto, ExecutionCreateResponseDto)
  @ApiCreatedResponse({
    description:
      'subjectType=human：返回 Execution（含 project/issue 摘要）；AI 执行：返回 { execution, approvalRequest, contextPack }',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(ExecutionRunResponseDto) },
        { $ref: getSchemaPath(ExecutionCreateResponseDto) },
      ],
    },
  })
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
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ExecutionConfirmResponseDto,
    description: '返回 { execution, approvalRequest }（审批与执行状态已更新）',
  })
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
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: IssueDependencyResponseDto,
    description: '返回依赖关系（已存在时返回既有记录）',
  })
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
  @ApiStandardErrors()
  @ApiOkResponse({
    type: IssueActivityResponseDto,
    isArray: true,
    description: '工单动态列表（按时间倒序）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getActivities(@Param('id') id: string, @CurrentUser() user: any) {
    return this.issueService.getActivities(id, user.id);
  }

  // ─── AI Execution Endpoints (V3: ExecutionRun) ────────────────────

  @Post('import')
  @ApiOperation({ summary: 'Import tasks from CSV/JSON' })
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: IssueImportResponseDto,
    description: '返回 { imported, tasks: Issue[] }（新建任务无关系预加载）',
  })
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
  @ApiStandardErrors()
  @ApiExtraModels(IssueExportRowDto)
  @ApiOkResponse({
    description:
      'format=json 返回导出行数组；format=csv 返回 CSV 文本（attachment 下载）',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: { $ref: getSchemaPath(IssueExportRowDto) },
        },
      },
      'text/csv': {
        schema: { type: 'string' },
      },
    },
  })
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
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ShortIdBackfillResponseDto,
    description: '返回 { success, total, successCount, failed, errors }',
  })
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
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ShortIdStatsResponseDto,
    description: '返回 { total, withShortId, withoutShortId }',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getShortIdStats() {
    return this.issueIdManagementService.getShortIdStats();
  }
}
