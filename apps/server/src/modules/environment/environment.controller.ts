/**
 * 本地基础环境端点（引导「环境检查」步骤/诊断消费）。
 *   GET  /_api/environment                 六项工具检测 + 可代装清单
 *   POST /_api/environment/install         按需安装 npm 系 AI CLI（白名单，CAP-A-30）
 *   GET  /_api/environment/install/:jobId  安装作业状态轮询
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';
import { EnvironmentService } from './environment.service';
import { EnvironmentInstallService } from './environment-install.service';
import {
  EnvironmentInstallJobDto,
  EnvironmentInstallRequestDto,
  EnvironmentReportDto,
} from './dto/environment.dto';

@ApiTags('Environment')
@ApiBearerAuth('JWT-auth')
@Controller('environment')
@UseGuards(JwtAuthGuard)
export class EnvironmentController {
  constructor(
    private readonly service: EnvironmentService,
    private readonly installService: EnvironmentInstallService,
  ) {}

  @Get()
  @ApiOperation({
    summary: '本地基础环境检测（node/git + AI CLI + 可代装清单）',
  })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: EnvironmentReportDto,
    description: '六项工具的安装与版本状态',
  })
  async check(): Promise<EnvironmentReportDto> {
    return this.service.check();
  }

  @Post('install')
  @HttpCode(201)
  @ApiOperation({
    summary: '按需安装 AI CLI（npm 白名单，受控 prefix）',
    description:
      '工具不在白名单/安装器缺失/已有同工具作业进行中时返回结构化 422/409',
  })
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: EnvironmentInstallJobDto,
    description: '安装作业已启动',
  })
  install(
    @Body() body: EnvironmentInstallRequestDto,
  ): EnvironmentInstallJobDto {
    return this.installService.start(body.tool);
  }

  @Get('install/:jobId')
  @ApiOperation({ summary: '安装作业状态轮询' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: EnvironmentInstallJobDto,
    description: '作业当前状态与日志尾部',
  })
  getJob(@Param('jobId') jobId: string): EnvironmentInstallJobDto {
    const job = this.installService.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Install job not found: ${jobId}`);
    }
    return job;
  }
}
