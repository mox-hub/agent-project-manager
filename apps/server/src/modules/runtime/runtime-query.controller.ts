/**
 * Runtime 查询控制面（JWT 保护，供前端 daemon 管理页使用）
 * 与 runtime.controller（@Public 设备协议）分离，只读 + 本机 daemon 运维（standalone）。
 */
import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DaemonOpsService } from './daemon-ops.service';
import { RuntimeService } from './runtime.service';

@ApiTags('Runtime')
@ApiBearerAuth('JWT-auth')
@Controller('runtime')
export class RuntimeQueryController {
  constructor(
    private readonly runtimeService: RuntimeService,
    private readonly daemonOpsService: DaemonOpsService,
  ) {}

  @Get('registrations')
  @ApiOperation({ summary: '列出全部 runtime 注册（脱敏）' })
  listRegistrations() {
    return this.runtimeService.listRegistrations();
  }

  @Get('local-daemon/status')
  @ApiOperation({
    summary: '本机 daemon 状态（锁持有者探活；standalone 限定）',
  })
  getLocalDaemonStatus() {
    return this.daemonOpsService.status();
  }

  @Post('local-daemon/start')
  @ApiOperation({
    summary: '拉起本机 daemon（detached spawn；standalone 限定）',
  })
  startLocalDaemon() {
    return this.daemonOpsService.start();
  }

  @Post('local-daemon/stop')
  @ApiOperation({ summary: '停止本机 daemon（进程树强杀；standalone 限定）' })
  stopLocalDaemon() {
    return this.daemonOpsService.stop();
  }

  @Get('approvals')
  @ApiOperation({ summary: '列出 runtime 审批（可按状态过滤）' })
  listApprovals(
    @Query('status') status?: 'pending' | 'approved' | 'rejected',
    @Query('limit') limit?: string,
  ) {
    const parsed = Number(limit);
    return this.runtimeService.listApprovals(
      status,
      Number.isFinite(parsed) && parsed > 0 ? parsed : 50,
    );
  }

  @Get('dispatches/summary')
  @ApiOperation({ summary: '派发活跃度摘要（同事位轮询轻端点）' })
  getDispatchesSummary(@Query('projectId') projectId?: string) {
    return this.runtimeService.getDispatchesSummary(projectId || undefined);
  }

  @Get('dispatches')
  @ApiOperation({ summary: '列出派发记录（prompt 截断）' })
  listDispatches(@Query('limit') limit?: string) {
    const parsed = Number(limit);
    return this.runtimeService.listDispatches(
      Number.isFinite(parsed) && parsed > 0 ? parsed : 50,
    );
  }
}
