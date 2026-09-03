import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ExecutionService } from './execution.service';
import { ApprovalService } from './approval.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('Execution')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('execution')
export class ExecutionController {
  constructor(
    private readonly executionService: ExecutionService,
    private readonly approvalService: ApprovalService,
  ) {}

  // Execution Run endpoints
  @Post('runs')
  @ApiOperation({ summary: '创建执行运行' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 401, description: '未登录' })
  async createRun(@Body() dto: any, @Request() req: { user: { id: string } }) {
    return this.executionService.createExecutionRun({
      ...dto,
      createdBy: req.user.id,
    });
  }

  @Get('runs')
  @ApiOperation({ summary: '列出执行运行' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'taskId', required: false })
  @ApiQuery({ name: 'subjectType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: '返回执行运行列表' })
  @ApiResponse({ status: 401, description: '未登录' })
  async listRuns(
    @Query() query: any,
    @Request() req: { user: { id: string } },
  ) {
    const { projectId, taskId, subjectType, status, limit, offset } = query;
    if (!projectId) {
      return { runs: [], total: 0 };
    }
    return this.executionService.listExecutionRuns(projectId, {
      taskId,
      subjectType,
      status,
      limit,
      offset,
    });
  }

  @Get('runs/:id')
  @ApiOperation({ summary: '获取执行运行详情' })
  @ApiParam({ name: 'id', description: '执行运行 ID' })
  @ApiResponse({ status: 200, description: '返回执行运行详情' })
  @ApiResponse({ status: 404, description: '执行运行不存在' })
  async getRun(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.executionService.getExecutionRun(id, req.user.id);
  }

  @Patch('runs/:id')
  @ApiOperation({ summary: '更新执行运行' })
  @ApiParam({ name: 'id', description: '执行运行 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateRun(@Param('id') id: string, @Body() dto: any) {
    return this.executionService.updateExecutionRun(id, dto);
  }

  @Post('runs/:id/start')
  @ApiOperation({ summary: '启动执行运行' })
  @ApiParam({ name: 'id', description: '执行运行 ID' })
  @ApiResponse({ status: 200, description: '已启动' })
  async startRun(@Param('id') id: string) {
    return this.executionService.startExecution(id);
  }

  @Post('runs/:id/complete')
  @ApiOperation({ summary: '完成执行运行' })
  @ApiParam({ name: 'id', description: '执行运行 ID' })
  @ApiResponse({ status: 200, description: '已完成' })
  async completeRun(
    @Param('id') id: string,
    @Body()
    body: {
      output?: Record<string, unknown>;
      artifacts?: Array<{
        artifactType: string;
        name: string;
        content?: string;
      }>;
    },
  ) {
    return this.executionService.completeExecution(
      id,
      body.output ?? {},
      body.artifacts,
    );
  }

  @Post('runs/:id/fail')
  @ApiOperation({ summary: '标记执行失败' })
  @ApiParam({ name: 'id', description: '执行运行 ID' })
  @ApiResponse({ status: 200, description: '已标记失败' })
  async failRun(
    @Param('id') id: string,
    @Body() body: { errorDetail: Record<string, unknown> },
  ) {
    return this.executionService.failExecution(id, body.errorDetail);
  }

  @Post('runs/:id/cancel')
  @ApiOperation({ summary: '取消执行运行' })
  @ApiParam({ name: 'id', description: '执行运行 ID' })
  @ApiResponse({ status: 200, description: '已取消' })
  async cancelRun(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.executionService.cancelExecution(id, body.reason);
  }

  @Get('runs/:id/steps')
  @ApiOperation({ summary: '获取执行步骤' })
  @ApiParam({ name: 'id', description: '执行运行 ID' })
  @ApiResponse({ status: 200, description: '返回步骤列表' })
  async getSteps(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.executionService
      .getExecutionRun(id, req.user.id)
      .then((run) => run.steps);
  }

  @Get('runs/:id/artifacts')
  @ApiOperation({ summary: '获取执行产物' })
  @ApiParam({ name: 'id', description: '执行运行 ID' })
  @ApiResponse({ status: 200, description: '返回产物列表' })
  async getArtifacts(@Param('id') id: string) {
    return this.executionService.getExecutionArtifacts(id);
  }

  @Get('projects/:projectId/active')
  @ApiOperation({ summary: '获取项目活跃执行' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiResponse({ status: 200, description: '返回活跃执行列表' })
  async getActiveExecutions(@Param('projectId') projectId: string) {
    return this.executionService.getActiveExecutions(projectId);
  }

  // Approval endpoints
  @Post('approvals')
  @ApiOperation({ summary: '创建审批请求' })
  @ApiResponse({ status: 201, description: '已创建审批' })
  @ApiResponse({ status: 400, description: '参数错误' })
  async createApproval(
    @Body() dto: any,
    @Request() req: { user: { id: string } },
  ) {
    return this.approvalService.createApprovalRequest(
      {
        ...dto,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      req.user.id,
    );
  }

  @Get('approvals')
  @ApiOperation({ summary: '列出审批请求' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiResponse({ status: 200, description: '返回审批列表' })
  async listApprovals(
    @Query() query: any,
    @Request() req: { user: { id: string } },
  ) {
    return this.approvalService.listApprovals(
      query.projectId,
      req.user.id,
      query,
    );
  }

  @Get('approvals/pending')
  @ApiOperation({ summary: '获取项目待审批列表' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiResponse({ status: 200, description: '返回待审批列表' })
  async getPendingApprovals(@Query('projectId') projectId: string) {
    return this.approvalService.getPendingApprovals(projectId);
  }

  @Get('approvals/stats')
  @ApiOperation({ summary: '获取审批统计' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiResponse({ status: 200, description: '返回审批统计' })
  async getApprovalStats(@Query('projectId') projectId: string) {
    return this.approvalService.getApprovalStats(projectId);
  }

  @Get('approvals/:id')
  @ApiOperation({ summary: '获取审批详情' })
  @ApiParam({ name: 'id', description: '审批 ID' })
  @ApiResponse({ status: 200, description: '返回审批详情' })
  @ApiResponse({ status: 404, description: '审批不存在' })
  async getApproval(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.approvalService.getApprovalRequest(id, req.user.id);
  }

  @Post('approvals/:id/resolve')
  @ApiOperation({ summary: '解决审批请求' })
  @ApiParam({ name: 'id', description: '审批 ID' })
  @ApiResponse({ status: 200, description: '已解决' })
  async resolveApproval(
    @Param('id') id: string,
    @Body() dto: any,
    @Request() req: { user: { id: string } },
  ) {
    return this.approvalService.resolveApproval(
      id,
      { resolution: dto.resolution, resolutionNote: dto.resolutionNote },
      req.user.id,
    );
  }

  @Post('approvals/:id/auto-approve')
  @ApiOperation({ summary: '自动审批低风险请求' })
  @ApiParam({ name: 'id', description: '审批 ID' })
  @ApiResponse({ status: 200, description: '已自动通过' })
  async autoApprove(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.approvalService.autoApprove(id, body.reason);
  }

  @Post('approvals/:id/cancel')
  @ApiOperation({ summary: '取消审批请求' })
  @ApiParam({ name: 'id', description: '审批 ID' })
  @ApiResponse({ status: 200, description: '已取消' })
  async cancelApproval(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.approvalService.cancelApproval(id, req.user.id);
  }
}
