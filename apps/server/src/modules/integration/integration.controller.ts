import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
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
import { IntegrationService } from './integration.service';
import { LinearSyncService } from './providers/linear/linear-sync.service';
import { CreateIntegrationConfigDto } from './dto/create-integration-config.dto';
import { UpdateIntegrationConfigDto } from './dto/update-integration-config.dto';
import { IntegrationQueryDto } from './dto/integration-query.dto';
import { CreateExternalIssueLinkDto } from './dto/create-external-issue-link.dto';
import { ExternalIssueQueryDto } from './dto/external-issue-query.dto';
import {
  ExternalIssueLinkResponseDto,
  IntegrationConfigResponseDto,
  IntegrationSyncLogResponseDto,
} from './dto/integration-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Integration')
@Controller('integrations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class IntegrationController {
  constructor(
    private readonly integrationService: IntegrationService,
    private readonly linearSyncService: LinearSyncService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get integration configurations' })
  @ApiOkResponse({
    type: [IntegrationConfigResponseDto],
    description: '集成配置列表（configJson 脱敏不出网）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getIntegrationConfigs(
    @Query() query: IntegrationQueryDto,
    @CurrentUser() user: { id: string },
  ) {
    return await this.integrationService.getIntegrationConfigs(query, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create integration configuration' })
  @ApiResponse({
    status: 201,
    description: 'Integration configuration created successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createIntegrationConfig(
    @Body() dto: CreateIntegrationConfigDto,
    @CurrentUser() user: { id: string },
  ) {
    return await this.integrationService.createIntegrationConfig(dto, user.id);
  }

  @Get('external-issues')
  @ApiOperation({ summary: 'Get external issue links' })
  @ApiOkResponse({
    type: [ExternalIssueLinkResponseDto],
    description: '外部工单链接列表',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getExternalIssueLinks(
    @Query() query: ExternalIssueQueryDto,
    @CurrentUser() user: { id: string },
  ) {
    return await this.integrationService.getExternalIssueLinks(query, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get integration configuration by ID' })
  @ApiParam({ name: 'id', description: 'Integration configuration ID' })
  @ApiOkResponse({
    type: IntegrationConfigResponseDto,
    description: '集成配置详情（configJson 脱敏不出网）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Integration configuration not found',
  })
  async getIntegrationConfigById(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return await this.integrationService.getIntegrationConfigById(id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update integration configuration' })
  @ApiParam({ name: 'id', description: 'Integration configuration ID' })
  @ApiResponse({
    status: 200,
    description: 'Integration configuration updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Integration configuration not found',
  })
  async updateIntegrationConfig(
    @Param('id') id: string,
    @Body() dto: UpdateIntegrationConfigDto,
    @CurrentUser() user: { id: string },
  ) {
    return await this.integrationService.updateIntegrationConfig(
      id,
      dto,
      user.id,
    );
  }

  @Get(':id/sync-logs')
  @ApiOperation({ summary: 'Get sync logs for an integration' })
  @ApiOkResponse({
    type: [IntegrationSyncLogResponseDto],
    description: '同步日志列表（按创建时间倒序）',
  })
  async getSyncLogs(
    @Param('id') id: string,
    @Query('projectId') projectId: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: { id: string },
  ) {
    // Reuse access check
    await this.integrationService.getIntegrationConfigById(id, user.id);
    return this.linearSyncService.getSyncLogs(
      id,
      limit ? parseInt(limit, 10) || 50 : 50,
      projectId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete integration configuration' })
  @ApiParam({ name: 'id', description: 'Integration configuration ID' })
  @ApiResponse({
    status: 200,
    description: 'Integration configuration deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Integration configuration not found',
  })
  async deleteIntegrationConfig(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.integrationService.deleteIntegrationConfig(id, user.id);
    return null;
  }

  @Post('external-issues')
  @ApiOperation({ summary: 'Create external issue link' })
  @ApiResponse({
    status: 201,
    description: 'External issue link created successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createExternalIssueLink(
    @Body() dto: CreateExternalIssueLinkDto,
    @CurrentUser() user: { id: string },
  ) {
    return await this.integrationService.createExternalIssueLink(dto, user.id);
  }
}
