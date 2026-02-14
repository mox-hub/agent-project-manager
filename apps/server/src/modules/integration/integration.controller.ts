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
import { IntegrationService } from './integration.service';
import { CreateIntegrationConfigDto } from './dto/create-integration-config.dto';
import { UpdateIntegrationConfigDto } from './dto/update-integration-config.dto';
import { IntegrationQueryDto } from './dto/integration-query.dto';
import { CreateExternalIssueLinkDto } from './dto/create-external-issue-link.dto';
import { ExternalIssueQueryDto } from './dto/external-issue-query.dto';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Get()
  async getIntegrationConfigs(
    @Query() query: IntegrationQueryDto,
    @CurrentUser() user: { id: string },
  ) {
    return {
      data: await this.integrationService.getIntegrationConfigs(query, user.id),
    };
  }

  @Post()
  async createIntegrationConfig(
    @Body() dto: CreateIntegrationConfigDto,
    @CurrentUser() user: { id: string },
  ) {
    return {
      data: await this.integrationService.createIntegrationConfig(dto, user.id),
    };
  }

  @Get(':id')
  async getIntegrationConfigById(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return {
      data: await this.integrationService.getIntegrationConfigById(id, user.id),
    };
  }

  @Put(':id')
  async updateIntegrationConfig(
    @Param('id') id: string,
    @Body() dto: UpdateIntegrationConfigDto,
    @CurrentUser() user: { id: string },
  ) {
    return {
      data: await this.integrationService.updateIntegrationConfig(id, dto, user.id),
    };
  }

  @Delete(':id')
  async deleteIntegrationConfig(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.integrationService.deleteIntegrationConfig(id, user.id);
    return { data: null };
  }

  @Get('external-issues')
  async getExternalIssueLinks(
    @Query() query: ExternalIssueQueryDto,
    @CurrentUser() user: { id: string },
  ) {
    return {
      data: await this.integrationService.getExternalIssueLinks(query, user.id),
    };
  }

  @Post('external-issues')
  async createExternalIssueLink(
    @Body() dto: CreateExternalIssueLinkDto,
    @CurrentUser() user: { id: string },
  ) {
    return {
      data: await this.integrationService.createExternalIssueLink(dto, user.id),
    };
  }
}
