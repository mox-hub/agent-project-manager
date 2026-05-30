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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExecutionService } from './execution.service';
import { ApprovalService } from './approval.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('Execution')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('/_api/execution')
export class ExecutionController {
  constructor(
    private readonly executionService: ExecutionService,
    private readonly approvalService: ApprovalService,
  ) {}

  // Execution Run endpoints
  @Post('runs')
  @ApiOperation({ summary: 'Create execution run' })
  async createRun(@Body() dto: any, @Request() req: { user: { id: string } }) {
    return this.executionService.createExecutionRun({
      ...dto,
      createdBy: req.user.id,
    });
  }

  @Get('runs')
  @ApiOperation({ summary: 'List execution runs' })
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
  @ApiOperation({ summary: 'Get execution run by ID' })
  async getRun(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.executionService.getExecutionRun(id, req.user.id);
  }

  @Patch('runs/:id')
  @ApiOperation({ summary: 'Update execution run' })
  async updateRun(@Param('id') id: string, @Body() dto: any) {
    return this.executionService.updateExecutionRun(id, dto);
  }

  @Post('runs/:id/start')
  @ApiOperation({ summary: 'Start execution run' })
  async startRun(@Param('id') id: string) {
    return this.executionService.startExecution(id);
  }

  @Post('runs/:id/complete')
  @ApiOperation({ summary: 'Complete execution run' })
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
  @ApiOperation({ summary: 'Fail execution run' })
  async failRun(
    @Param('id') id: string,
    @Body() body: { errorDetail: Record<string, unknown> },
  ) {
    return this.executionService.failExecution(id, body.errorDetail);
  }

  @Post('runs/:id/cancel')
  @ApiOperation({ summary: 'Cancel execution run' })
  async cancelRun(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.executionService.cancelExecution(id, body.reason);
  }

  @Get('runs/:id/steps')
  @ApiOperation({ summary: 'Get execution steps' })
  async getSteps(@Param('id') id: string) {
    return this.executionService
      .getExecutionRun(id, 'system')
      .then((run) => run.steps);
  }

  @Get('runs/:id/artifacts')
  @ApiOperation({ summary: 'Get execution artifacts' })
  async getArtifacts(@Param('id') id: string) {
    return this.executionService.getExecutionArtifacts(id);
  }

  @Get('projects/:projectId/active')
  @ApiOperation({ summary: 'Get active executions for project' })
  async getActiveExecutions(@Param('projectId') projectId: string) {
    return this.executionService.getActiveExecutions(projectId);
  }

  // Approval endpoints
  @Post('approvals')
  @ApiOperation({ summary: 'Create approval request' })
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
  @ApiOperation({ summary: 'List approval requests' })
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
  @ApiOperation({ summary: 'Get pending approvals for project' })
  async getPendingApprovals(@Query('projectId') projectId: string) {
    return this.approvalService.getPendingApprovals(projectId);
  }

  @Get('approvals/stats')
  @ApiOperation({ summary: 'Get approval statistics' })
  async getApprovalStats(@Query('projectId') projectId: string) {
    return this.approvalService.getApprovalStats(projectId);
  }

  @Get('approvals/:id')
  @ApiOperation({ summary: 'Get approval request by ID' })
  async getApproval(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.approvalService.getApprovalRequest(id, req.user.id);
  }

  @Post('approvals/:id/resolve')
  @ApiOperation({ summary: 'Resolve approval request' })
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
  @ApiOperation({ summary: 'Auto-approve low-risk approval' })
  async autoApprove(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.approvalService.autoApprove(id, body.reason);
  }

  @Post('approvals/:id/cancel')
  @ApiOperation({ summary: 'Cancel pending approval' })
  async cancelApproval(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.approvalService.cancelApproval(id, req.user.id);
  }
}
