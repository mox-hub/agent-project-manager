/**
 * CLI Dispatch Controller
 */

import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CliDispatchService } from './dispatch.service';
import { CliProviderRegistry } from './cli-provider.registry';
import { ExecutionService } from '@/modules/execution/execution.service';
import { CliExecutorService } from './cli-executor.service';
import {
  CliProvidersResponseDto,
  DetectedCliProvidersResponseDto,
  ExecutionStatusResponseDto,
} from './dto/cli-provider-response.dto';
import { RetryExecutionDto } from './dto/retry-execution.dto';

class DispatchCliDto {
  @IsOptional()
  @IsString()
  memberId?: string;

  @IsOptional()
  @IsIn(['claude-code', 'codex', 'zcode'])
  providerId?: 'claude-code' | 'codex' | 'zcode';

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedTools?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  timeout?: number;

  @IsOptional()
  @IsString()
  executionId?: string;
}

@ApiTags('CLI Dispatch')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CliDispatchController {
  constructor(
    private readonly dispatchService: CliDispatchService,
    private readonly registry: CliProviderRegistry,
    private readonly executionService: ExecutionService,
    private readonly executor: CliExecutorService,
  ) {}

  @Post('issues/:issueId/dispatch-cli')
  @ApiOperation({ summary: 'Dispatch task to CLI for AI execution' })
  @ApiResponse({ status: 200, description: 'Task dispatched to CLI' })
  @ApiResponse({
    status: 400,
    description:
      'Invalid request or provider unavailable。含信任门禁拦截：code=TRUST_LEVEL_INSUFFICIENT（目标 AI 成员信任等级为观察者，自动派发需协助者及以上；details 带当前/所需等级与提升指路），未评估成员放行并记工单时间线提示',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async dispatchToCli(
    @Param('issueId') issueId: string,
    @Body() dto: DispatchCliDto,
    @CurrentUser() user: any,
  ) {
    return this.dispatchService.dispatchTaskToCli(issueId, user.id, {
      memberId: dto.memberId,
      providerId: dto.providerId,
      model: dto.model,
      allowedTools: dto.allowedTools,
      timeout: dto.timeout,
      executionId: dto.executionId,
    });
  }

  @Get('cli-providers')
  @ApiOperation({ summary: 'Get available CLI providers on this machine' })
  @ApiOkResponse({
    type: CliProvidersResponseDto,
    description: '本机 CLI provider 列表与默认 provider',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCliProviders() {
    const all = this.registry.listAll();
    return {
      providers: all.map((p) => ({
        providerId: p.providerId,
        available: p.available,
        version: p.version,
        error: p.error,
      })),
      defaultProvider: this.registry.isAvailable('claude-code')
        ? 'claude-code'
        : this.registry.isAvailable('codex')
          ? 'codex'
          : null,
    };
  }

  @Get('cli-providers/detect')
  @ApiOperation({ summary: 'Re-detect CLI providers' })
  @ApiOkResponse({
    type: DetectedCliProvidersResponseDto,
    description: '重新探测后的 provider 列表',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async detectProviders() {
    const results = await this.registry.detectAllProviders();
    return { providers: results };
  }

  @Post('execution-runs/:id/cancel')
  @ApiOperation({
    summary:
      'Cancel a CLI execution (falls back to execution-record cancel when no CLI binding exists)',
  })
  @ApiParam({ name: 'id', description: 'Execution Run ID' })
  @ApiResponse({
    status: 200,
    description:
      'Execution cancelled。success 表示是否终止了 CLI 进程；无 CLI 绑定时按执行记录直接走状态机取消，success 为 false 但取消已生效',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async cancelExecution(
    @Param('id') executionRunId: string,
    @CurrentUser() user: any,
  ) {
    const cancelled = await this.dispatchService.cancelExecution(
      executionRunId,
      user.id,
    );
    return { success: cancelled };
  }

  @Post('execution-runs/:id/retry')
  @ApiOperation({
    summary:
      'Re-execute a failed/blocked/superseded execution as a new execution (clone + lineage + same dispatch flow)',
  })
  @ApiParam({
    name: 'id',
    description: '原执行 ID（须为 failed/blocked/superseded）',
  })
  @ApiResponse({
    status: 200,
    description: '新执行已创建并派发（retryOfId 血缘指回原执行）',
  })
  @ApiResponse({
    status: 400,
    description:
      '不可重新执行：状态非 failed/blocked/superseded，或未关联有效工单；存在其他活跃执行时按错误信息先取消；派发被门禁（验收契约/依赖/信任等级 TRUST_LEVEL_INSUFFICIENT）阻断时新执行落 blocked',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async retryExecution(
    @Param('id') executionRunId: string,
    @CurrentUser() user: any,
    @Body() dto?: RetryExecutionDto,
  ) {
    return this.dispatchService.retryExecution(
      executionRunId,
      user.id,
      dto?.diagnosis,
    );
  }

  @Get('execution-runs/:id/status')
  @ApiOperation({ summary: 'Get CLI execution status' })
  @ApiParam({ name: 'id', description: 'Execution Run ID' })
  @ApiOkResponse({
    type: ExecutionStatusResponseDto,
    description: '执行状态（含本机进程存活判定）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async getExecutionStatus(
    @Param('id') executionRunId: string,
    @CurrentUser() user: any,
  ) {
    const run = await this.executionService.getExecutionRun(
      executionRunId,
      user.id,
    );

    return {
      executionRunId: run.id,
      status: run.status,
      isRunning: this.executor.isRunning(executionRunId),
      startedAt: run.startedAt,
      completedAt: run.completedAt,
    };
  }
}
