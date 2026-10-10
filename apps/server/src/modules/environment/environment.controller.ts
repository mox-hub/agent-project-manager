/**
 * 本地基础环境检测端点（引导「环境检查」步骤/诊断消费）。
 *   GET /_api/environment   六项工具检测（node/git/claude-code/codex/zcode/opencode）
 */

import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';
import { EnvironmentService } from './environment.service';
import { EnvironmentReportDto } from './dto/environment.dto';

@ApiTags('Environment')
@ApiBearerAuth('JWT-auth')
@Controller('environment')
@UseGuards(JwtAuthGuard)
export class EnvironmentController {
  constructor(private readonly service: EnvironmentService) {}

  @Get()
  @ApiOperation({ summary: '本地基础环境检测（node/git + AI CLI）' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: EnvironmentReportDto,
    description: '六项工具的安装与版本状态',
  })
  async check(): Promise<EnvironmentReportDto> {
    return this.service.check();
  }
}
