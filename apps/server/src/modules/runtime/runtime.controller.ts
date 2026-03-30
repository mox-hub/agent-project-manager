import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { RuntimeService } from './runtime.service';
import { RuntimeRegisterDto } from './dto/runtime-register.dto';
import { RuntimeCapabilitiesDto } from './dto/runtime-capabilities.dto';
import { RuntimeHeartbeatDto } from './dto/runtime-heartbeat.dto';
import { DispatchQueryDto } from './dto/dispatch-query.dto';
import { ExecutionEventDto } from './dto/execution-event.dto';
import { ExecutionResultDto } from './dto/execution-result.dto';
import { ApprovalRequestDto } from './dto/approval-request.dto';
import { RuntimeSessionGuard } from './guards/runtime-session.guard';

@ApiTags('Runtime')
@Controller('runtime')
@Public()
export class RuntimeController {
  constructor(private readonly runtimeService: RuntimeService) {}

  @Post('register')
  @ApiOperation({ summary: 'Runtime 注册' })
  @ApiResponse({ status: 201, description: 'Runtime 注册成功' })
  register(@Body() dto: RuntimeRegisterDto) {
    return this.runtimeService.register(dto);
  }

  @Put(':runtimeId/capabilities')
  @UseGuards(RuntimeSessionGuard)
  @ApiBearerAuth('RuntimeSession')
  @ApiParam({ name: 'runtimeId' })
  @ApiOperation({ summary: 'Runtime 能力上报' })
  updateCapabilities(
    @Param('runtimeId') runtimeId: string,
    @Body() dto: RuntimeCapabilitiesDto,
  ) {
    return this.runtimeService.updateCapabilities(runtimeId, dto);
  }

  @Post(':runtimeId/heartbeat')
  @UseGuards(RuntimeSessionGuard)
  @ApiBearerAuth('RuntimeSession')
  @ApiParam({ name: 'runtimeId' })
  @ApiOperation({ summary: 'Runtime 心跳上报' })
  heartbeat(
    @Param('runtimeId') runtimeId: string,
    @Body() dto: RuntimeHeartbeatDto,
  ) {
    return this.runtimeService.heartbeat(runtimeId, dto);
  }

  @Get(':runtimeId/dispatches')
  @UseGuards(RuntimeSessionGuard)
  @ApiBearerAuth('RuntimeSession')
  @ApiParam({ name: 'runtimeId' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiOperation({ summary: '拉取待执行任务派发' })
  getDispatches(
    @Param('runtimeId') runtimeId: string,
    @Query() query: DispatchQueryDto,
  ) {
    return this.runtimeService.getDispatches(
      runtimeId,
      query.status ?? 'pending',
      query.limit ?? 20,
    );
  }

  @Get('executions/:executionRunId/context')
  @UseGuards(RuntimeSessionGuard)
  @ApiBearerAuth('RuntimeSession')
  @ApiParam({ name: 'executionRunId' })
  @ApiOperation({ summary: '获取执行上下文' })
  getExecutionContext(
    @Param('executionRunId') executionRunId: string,
    @Req() req: any,
  ) {
    return this.runtimeService.getExecutionContext(
      executionRunId,
      req.runtimeSession.runtimeId,
    );
  }

  @Post('executions/:executionRunId/events')
  @UseGuards(RuntimeSessionGuard)
  @ApiBearerAuth('RuntimeSession')
  @ApiParam({ name: 'executionRunId' })
  @ApiOperation({ summary: '提交执行事件' })
  submitExecutionEvent(
    @Param('executionRunId') executionRunId: string,
    @Body() dto: ExecutionEventDto,
    @Req() req: any,
  ) {
    return this.runtimeService.submitExecutionEvent(
      executionRunId,
      dto,
      req.runtimeSession.runtimeId,
    );
  }

  @Post('executions/:executionRunId/result')
  @UseGuards(RuntimeSessionGuard)
  @ApiBearerAuth('RuntimeSession')
  @ApiParam({ name: 'executionRunId' })
  @ApiOperation({ summary: '提交执行结果' })
  submitExecutionResult(
    @Param('executionRunId') executionRunId: string,
    @Body() dto: ExecutionResultDto,
    @Req() req: any,
  ) {
    return this.runtimeService.submitExecutionResult(
      executionRunId,
      dto,
      req.runtimeSession.runtimeId,
    );
  }

  @Post('executions/:executionRunId/approval-request')
  @UseGuards(RuntimeSessionGuard)
  @ApiBearerAuth('RuntimeSession')
  @ApiParam({ name: 'executionRunId' })
  @ApiOperation({ summary: '提交审批请求' })
  requestApproval(
    @Param('executionRunId') executionRunId: string,
    @Body() dto: ApprovalRequestDto,
    @Req() req: any,
  ) {
    return this.runtimeService.requestApproval(
      executionRunId,
      dto,
      req.runtimeSession.runtimeId,
    );
  }
}
