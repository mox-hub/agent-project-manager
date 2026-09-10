/**
 * Workflow REST 面（CAP-A-11 基座）——接管原 ai-hub 的空壳端点。
 *
 * 路径与响应形状保持兼容（前端与 openapi 契约无破坏性变更）：
 * - GET    /workflows            定义列表
 * - GET    /workflows/:id        定义详情（含 definition 文法）
 * - POST   /workflows/:id/run    触发（:id 兼容 key 或 cuid）
 * - GET    /workflow-runs        run 分页
 * - GET    /workflow-runs/:id    run 详情（替换原 Not implemented 占位）
 * - POST   /workflow-runs/:id/resume  恢复 suspend 的 run（人工确认）
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';
import { WorkflowService } from './workflow.service';
import {
  CreateWorkflowDto,
  ListWorkflowRunsQuery,
  ResumeWorkflowDto,
  TriggerWorkflowDto,
  UpdateWorkflowDto,
} from './dto/workflow.dto';
import {
  WorkflowDetailDto as WorkflowDetailResponseDto,
  WorkflowRunDetailResponseDto,
  WorkflowRunsListResponseDto,
  WorkflowRunTriggerResponseDto,
  WorkflowSummaryDto,
} from './dto/workflow-response.dto';

@ApiTags('workflows')
@UseGuards(JwtAuthGuard)
@Controller()
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get('workflows')
  @ApiOperation({ summary: '工作流定义列表' })
  @ApiOkResponse({
    type: [WorkflowSummaryDto],
    description: '工作流列表（id/key/name/description/version）',
  })
  @ApiStandardErrors()
  async getWorkflows(): Promise<WorkflowSummaryDto[]> {
    return this.workflowService.listDefinitions();
  }

  @Get('workflows/actions')
  @ApiOperation({ summary: '产品动作目录（CAP-A-12 节点库单一真相）' })
  @ApiOkResponse({
    description: '动作清单（id/title/description/requiredParams/inputHint）',
  })
  @ApiStandardErrors()
  async listActions() {
    return this.workflowService.listActions();
  }

  @Get('workflows/:id')
  @ApiOperation({ summary: '工作流定义详情' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiOkResponse({
    type: WorkflowDetailResponseDto,
    description: '工作流详情（含 definition 文法与步骤清单）',
  })
  @ApiStandardErrors()
  async getWorkflow(
    @Param('id') id: string,
  ): Promise<WorkflowDetailResponseDto> {
    // Prisma JsonValue 字段（definition）与 DTO 的 Record 视角对齐
    return (await this.workflowService.getDefinition(
      id,
    )) as unknown as WorkflowDetailResponseDto;
  }

  @Post('workflows')
  @ApiOperation({
    summary: '创建工作流定义（画布编辑保存；人直接编辑不走决策卡）',
  })
  @ApiOkResponse({
    description: '创建成功（id/key/version）',
  })
  @ApiStandardErrors()
  async createWorkflow(
    @Body() dto: CreateWorkflowDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.workflowService.createDefinition(dto, req.user.id);
  }

  @Patch('workflows/:id')
  @ApiOperation({ summary: '更新工作流定义（definition 变更时 version 自增）' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiOkResponse({
    description: '更新成功（id/key/version/stepsSummary）',
  })
  @ApiStandardErrors()
  async updateWorkflow(
    @Param('id') id: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.workflowService.updateDefinition(id, dto);
  }

  @Post('workflows/:id/run')
  @HttpCode(200)
  @ApiOperation({ summary: '触发工作流运行（异步执行）' })
  @ApiParam({ name: 'id', description: 'Workflow ID（id 或 key）' })
  @ApiOkResponse({
    type: WorkflowRunTriggerResponseDto,
    description: '运行已创建（异步执行）',
  })
  @ApiStandardErrors()
  async triggerRun(
    @Param('id') id: string,
    @Body() dto: TriggerWorkflowDto,
    @Request() req: { user: { id: string } },
  ): Promise<WorkflowRunTriggerResponseDto> {
    return this.workflowService.triggerRun(id, dto, req.user.id);
  }

  @Get('workflow-runs')
  @ApiOperation({ summary: '工作流运行分页列表' })
  @ApiOkResponse({
    type: WorkflowRunsListResponseDto,
    description: '运行分页列表（{ data, meta }）',
  })
  @ApiStandardErrors()
  async getWorkflowRuns(
    @Query() query: ListWorkflowRunsQuery,
  ): Promise<WorkflowRunsListResponseDto> {
    return (await this.workflowService.listRuns(
      query,
    )) as unknown as WorkflowRunsListResponseDto;
  }

  @Get('workflow-runs/:id')
  @ApiOperation({ summary: '工作流运行详情（含步骤状态）' })
  @ApiParam({ name: 'id', description: 'Workflow run ID' })
  @ApiOkResponse({
    type: WorkflowRunDetailResponseDto,
    description: '运行详情（status=waiting_approval 时含待确认步骤信息）',
  })
  @ApiStandardErrors()
  async getRun(@Param('id') id: string): Promise<WorkflowRunDetailResponseDto> {
    return (await this.workflowService.getRun(
      id,
    )) as unknown as WorkflowRunDetailResponseDto;
  }

  @Post('workflow-runs/:id/resume')
  @HttpCode(200)
  @ApiOperation({ summary: '恢复被人工确认暂停的工作流运行' })
  @ApiParam({ name: 'id', description: 'Workflow run ID' })
  @ApiOkResponse({
    type: WorkflowRunTriggerResponseDto,
    description: '恢复已受理（异步继续执行）',
  })
  @ApiStandardErrors()
  async resumeRun(
    @Param('id') id: string,
    @Body() dto: ResumeWorkflowDto,
    @Request() req: { user: { id: string } },
  ): Promise<WorkflowRunTriggerResponseDto> {
    return this.workflowService.resumeRun(id, dto.resumeData, req.user.id);
  }
}
