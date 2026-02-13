import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { MetadataService } from './metadata.service';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@Controller('metadata')
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  // Tags
  @Get('tags')
  async getTags(
    @Query('projectId') projectId?: string,
    @Query('resourceType') resourceType?: string,
  ) {
    return this.metadataService.getTags(projectId, resourceType);
  }

  @Post('tags')
  async createOrUpdateTag(@Body() data: any, @CurrentUser() user: any) {
    return this.metadataService.createOrUpdateTag(data, user?.id);
  }

  @Delete('tags/:tagId')
  async deleteTag(@Param('tagId') tagId: string) {
    return this.metadataService.deleteTag(tagId);
  }

  // Status Definitions
  @Get('statuses')
  async getStatuses(
    @Query('projectId') projectId?: string,
    @Query('type') type?: string,
  ) {
    return this.metadataService.getStatuses(projectId, type);
  }

  @Post('statuses')
  async createOrUpdateStatus(@Body() data: any) {
    return this.metadataService.createOrUpdateStatus(data);
  }

  @Delete('statuses/:statusId')
  async deleteStatus(@Param('statusId') statusId: string) {
    return this.metadataService.deleteStatus(statusId);
  }

  // Project Roles
  @Get('project-roles')
  async getProjectRoles(@Query('projectId') projectId?: string) {
    return this.metadataService.getProjectRoles(projectId);
  }

  @Post('project-roles')
  async createOrUpdateProjectRole(@Body() data: any) {
    return this.metadataService.createOrUpdateProjectRole(data);
  }

  @Delete('project-roles/:roleId')
  async deleteProjectRole(@Param('roleId') roleId: string) {
    return this.metadataService.deleteProjectRole(roleId);
  }

  // Project Templates
  @Get('templates/projects')
  async getProjectTemplates(@Query('q') q?: string) {
    return this.metadataService.getProjectTemplates(q);
  }

  @Post('templates/projects')
  async createOrUpdateProjectTemplate(
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.metadataService.createOrUpdateProjectTemplate(data, user?.id);
  }
}
