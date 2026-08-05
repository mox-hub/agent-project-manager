/**
 * CLI Dispatch Controller
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CliDispatchService } from './dispatch.service';
import { CliProviderRegistry } from './cli-provider.registry';
import { ExecutionService } from '@/modules/execution/execution.service';
import { CliExecutorService } from './cli-executor.service';

class DispatchCliDto {
  agentBindingId?: string;
  providerId?: 'claude-code' | 'codex' | 'zcode';
  model?: string;
  allowedTools?: string[];
  timeout?: number;
}

class CancelExecutionDto {
  reason?: string;
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

  @Post('tasks/:taskId/dispatch-cli')
  @ApiOperation({ summary: 'Dispatch task to CLI for AI execution' })
  @ApiResponse({ status: 200, description: 'Task dispatched to CLI' })
  @ApiResponse({ status: 400, description: 'Invalid request or provider unavailable' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async dispatchToCli(
    @Param('taskId') taskId: string,
    @Body() dto: DispatchCliDto,
    @CurrentUser() user: any,
  ) {
    return this.dispatchService.dispatchTaskToCli(taskId, user.id, {
      agentBindingId: dto.agentBindingId,
      providerId: dto.providerId,
      model: dto.model,
      allowedTools: dto.allowedTools,
      timeout: dto.timeout,
    });
  }

  @Get('cli-providers')
  @ApiOperation({ summary: 'Get available CLI providers on this machine' })
  @ApiResponse({ status: 200, description: 'Returns list of CLI providers' })
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
  @ApiResponse({ status: 200, description: 'Returns detected providers' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async detectProviders() {
    const results = await this.registry.detectAllProviders();
    return { providers: results };
  }

  @Post('execution-runs/:id/cancel')
  @ApiOperation({ summary: 'Cancel a running CLI execution' })
  @ApiParam({ name: 'id', description: 'Execution Run ID' })
  @ApiResponse({ status: 200, description: 'Execution cancelled' })
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

  @Get('execution-runs/:id/status')
  @ApiOperation({ summary: 'Get CLI execution status' })
  @ApiParam({ name: 'id', description: 'Execution Run ID' })
  @ApiResponse({ status: 200, description: 'Returns execution status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async getExecutionStatus(@Param('id') executionRunId: string) {
    const run = await this.executionService.getExecutionRun(executionRunId, 'system');

    return {
      executionRunId: run.id,
      status: run.status,
      isRunning: this.executor.isRunning(executionRunId),
      startedAt: run.startedAt,
      completedAt: run.completedAt,
    };
  }
}
