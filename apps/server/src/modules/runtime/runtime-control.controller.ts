import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RuntimeService } from './runtime.service';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { ResolveApprovalDto } from './dto/resolve-approval.dto';
import { CancelExecutionDto } from './dto/cancel-execution.dto';

@ApiTags('Runtime')
@Controller('runtime/control')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class RuntimeControlController {
  constructor(private readonly runtimeService: RuntimeService) {}

  @Post('dispatches')
  @ApiOperation({ summary: '控制面创建执行派发并推送给 Runtime' })
  @ApiResponse({ status: 201, description: '派发创建成功' })
  async createDispatch(@Body() dto: CreateDispatchDto) {
    await this.runtimeService.createDispatch(dto.runtimeId, {
      executionRunId: dto.executionRunId,
      projectId: dto.projectId,
      taskId: dto.taskId,
      subjectType: dto.subjectType,
      subjectId: dto.subjectId,
      contextPackRef: dto.contextPackRef,
      requestedActions: dto.requestedActions,
      toolScopes: dto.toolScopes,
      approvalState: dto.approvalState,
      policySnapshot: dto.policySnapshot,
      status: 'pending',
    });

    return {
      executionRunId: dto.executionRunId,
      runtimeId: dto.runtimeId,
      status: 'pending',
    };
  }

  @Post('approvals/:approvalRequestId/resolve')
  @ApiParam({ name: 'approvalRequestId' })
  @ApiOperation({ summary: '控制面审批决议并回传 Runtime' })
  async resolveApproval(
    @Param('approvalRequestId') approvalRequestId: string,
    @Body() dto: ResolveApprovalDto,
  ) {
    return this.runtimeService.resolveApproval(
      approvalRequestId,
      dto.resolution ?? 'approved',
      dto.resolutionNote,
    );
  }

  @Post('executions/:executionRunId/cancel')
  @ApiParam({ name: 'executionRunId' })
  @ApiOperation({ summary: '控制面取消执行并通知 Runtime' })
  async cancelExecution(
    @Param('executionRunId') executionRunId: string,
    @Body() dto: CancelExecutionDto,
  ) {
    return this.runtimeService.cancelExecution(
      executionRunId,
      dto.reason,
      dto.cancelledBy,
    );
  }
}
