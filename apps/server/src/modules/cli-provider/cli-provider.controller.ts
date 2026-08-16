/**
 * CLI Provider Controller
 *
 * REST 端点：
 *   GET    /_api/cli-providers              列表
 *   POST   /_api/cli-providers/detect       重新探测
 *   GET    /_api/cli-providers/:id/health   单个健康检查
 *   PUT    /_api/cli-providers/:id          upsert 配置
 *   DELETE /_api/cli-providers/:id          删除配置（恢复默认）
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import {
  CliProviderService,
  CliProvidersResponse,
  CliProviderStatus,
} from './cli-provider.service';
import {
  ConfigureCliProviderDto,
  CliProviderId,
  CLI_PROVIDER_IDS,
} from './dto/configure-cli-provider.dto';

function isCliProviderId(id: string): id is CliProviderId {
  return (CLI_PROVIDER_IDS as readonly string[]).includes(id);
}

@ApiTags('CLI Providers')
@ApiBearerAuth('JWT-auth')
@Controller('cli-providers')
@UseGuards(JwtAuthGuard)
export class CliProviderController {
  constructor(private readonly service: CliProviderService) {}

  @Get()
  @ApiOperation({ summary: 'List all CLI providers with status' })
  @ApiResponse({ status: 200, type: Object })
  async listProviders(): Promise<CliProvidersResponse> {
    return this.service.listProviders();
  }

  @Post('detect')
  @ApiOperation({ summary: 'Re-detect all CLI providers on this machine' })
  @ApiResponse({ status: 200, description: 'Returns detected providers' })
  async detectAll(): Promise<{ providers: CliProviderStatus[] }> {
    const providers = await this.service.detectAll();
    return { providers };
  }

  @Get(':id/health')
  @ApiOperation({ summary: 'Health check a single CLI provider' })
  @ApiParam({ name: 'id', enum: CLI_PROVIDER_IDS })
  @ApiResponse({ status: 200, description: 'Provider health status' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async healthCheck(@Param('id') id: string): Promise<CliProviderStatus> {
    if (!isCliProviderId(id)) {
      throw new (await import('@nestjs/common')).BadRequestException(
        `Invalid provider id: ${id}`,
      );
    }
    return this.service.healthCheck(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Configure (upsert) a CLI provider' })
  @ApiParam({ name: 'id', enum: CLI_PROVIDER_IDS })
  @ApiResponse({ status: 200, description: 'Provider configured' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async configureProvider(
    @Param('id') id: string,
    @Body() dto: ConfigureCliProviderDto,
  ): Promise<CliProviderStatus> {
    if (!isCliProviderId(id)) {
      throw new (await import('@nestjs/common')).BadRequestException(
        `Invalid provider id: ${id}`,
      );
    }
    return this.service.configureProvider(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete provider config (reset to built-in defaults)',
  })
  @ApiParam({ name: 'id', enum: CLI_PROVIDER_IDS })
  @ApiResponse({ status: 200, description: 'Provider config deleted' })
  @ApiResponse({ status: 404, description: 'Provider config not found' })
  async deleteProvider(@Param('id') id: string): Promise<{ success: boolean }> {
    if (!isCliProviderId(id)) {
      throw new (await import('@nestjs/common')).BadRequestException(
        `Invalid provider id: ${id}`,
      );
    }
    await this.service.deleteProvider(id);
    return { success: true };
  }
}
