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
  ApiOkResponse,
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
  CliAssetScannerService,
  type CliAssetsResult,
} from './cli-asset-scanner.service';
import {
  ConfigureCliProviderDto,
  CliAssetsResponseDto,
  CliProviderDetectResponseDto,
  CliProviderId,
  CliProvidersResponseDto,
  CliProviderStatusDto,
  CLI_PROVIDER_IDS,
} from './dto/configure-cli-provider.dto';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';

function isCliProviderId(id: string): id is CliProviderId {
  return (CLI_PROVIDER_IDS as readonly string[]).includes(id);
}

@ApiTags('CLI Providers')
@ApiBearerAuth('JWT-auth')
@Controller('cli-providers')
@UseGuards(JwtAuthGuard)
export class CliProviderController {
  constructor(
    private readonly service: CliProviderService,
    private readonly assetScanner: CliAssetScannerService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all CLI providers with status' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: CliProvidersResponseDto,
    description: 'Providers with merged config + runtime status',
  })
  async listProviders(): Promise<CliProvidersResponse> {
    return this.service.listProviders();
  }

  @Post('detect')
  @ApiOperation({ summary: 'Re-detect all CLI providers on this machine' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: CliProviderDetectResponseDto,
    description: 'Returns detected providers',
  })
  async detectAll(): Promise<{ providers: CliProviderStatus[] }> {
    const providers = await this.service.detectAll();
    return { providers };
  }

  @Get(':id/health')
  @ApiOperation({ summary: 'Health check a single CLI provider' })
  @ApiParam({ name: 'id', enum: CLI_PROVIDER_IDS })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: CliProviderStatusDto,
    description: 'Provider health status',
  })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async healthCheck(@Param('id') id: string): Promise<CliProviderStatus> {
    if (!isCliProviderId(id)) {
      throw new (await import('@nestjs/common')).BadRequestException(
        `Invalid provider id: ${id}`,
      );
    }
    return this.service.healthCheck(id);
  }

  @Get(':id/assets')
  @ApiOperation({
    summary:
      '发现 CLI 工具本机的技能与 MCP Server（best-effort，读不到=空+note）',
  })
  @ApiParam({ name: 'id', enum: CLI_PROVIDER_IDS })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: CliAssetsResponseDto,
    description: '返回该 CLI 本地技能/MCP 清单（成员工具授权「CLI 来源」目录）',
  })
  async listAssets(@Param('id') id: string): Promise<CliAssetsResult> {
    if (!isCliProviderId(id)) {
      throw new (await import('@nestjs/common')).BadRequestException(
        `Invalid provider id: ${id}`,
      );
    }
    return this.assetScanner.listAssets(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Configure (upsert) a CLI provider' })
  @ApiParam({ name: 'id', enum: CLI_PROVIDER_IDS })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: CliProviderStatusDto,
    description: 'Provider configured',
  })
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
  @ApiStandardErrors()
  @ApiOkResponse({
    description: 'Provider config deleted',
    schema: {
      type: 'object',
      properties: { success: { type: 'boolean', example: true } },
    },
  })
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
