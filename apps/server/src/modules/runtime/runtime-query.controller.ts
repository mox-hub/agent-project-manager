/**
 * Runtime 查询控制面（JWT 保护，供前端 daemon 管理页使用）
 * 与 runtime.controller（@Public 设备协议）分离，只读。
 */
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RuntimeService } from './runtime.service';

@ApiTags('Runtime')
@ApiBearerAuth('JWT-auth')
@Controller('runtime')
export class RuntimeQueryController {
  constructor(private readonly runtimeService: RuntimeService) {}

  @Get('registrations')
  @ApiOperation({ summary: '列出全部 runtime 注册（脱敏）' })
  listRegistrations() {
    return this.runtimeService.listRegistrations();
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

  @Get('dispatches')
  @ApiOperation({ summary: '列出派发记录（prompt 截断）' })
  listDispatches(@Query('limit') limit?: string) {
    const parsed = Number(limit);
    return this.runtimeService.listDispatches(
      Number.isFinite(parsed) && parsed > 0 ? parsed : 50,
    );
  }
}
