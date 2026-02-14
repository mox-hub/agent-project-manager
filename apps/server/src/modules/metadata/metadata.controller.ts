import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MetadataService } from './metadata.service';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';

@Controller('metadata')
@UseGuards(JwtAuthGuard)
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
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'maintainer')
  async createOrUpdateTag(@Body() data: any, @CurrentUser() user: any) {
    return this.metadataService.createOrUpdateTag(data, user?.id, user?.id);
  }

  @Delete('tags/:tagId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'maintainer')
  async deleteTag(@Param('tagId') tagId: string, @CurrentUser() user: any) {
    return this.metadataService.deleteTag(tagId, user?.id);
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
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'maintainer')
  async createOrUpdateStatus(@Body() data: any, @CurrentUser() user: any) {
    return this.metadataService.createOrUpdateStatus(data, user?.id);
  }

  @Delete('statuses/:statusId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'maintainer')
  async deleteStatus(@Param('statusId') statusId: string, @CurrentUser() user: any) {
    return this.metadataService.deleteStatus(statusId, user?.id);
  }

  // Project Roles
  @Get('project-roles')
  async getProjectRoles(@Query('projectId') projectId?: string) {
    return this.metadataService.getProjectRoles(projectId);
  }

  @Post('project-roles')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'maintainer')
  async createOrUpdateProjectRole(@Body() data: any, @CurrentUser() user: any) {
    return this.metadataService.createOrUpdateProjectRole(data, user?.id);
  }

  @Delete('project-roles/:roleId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'maintainer')
  async deleteProjectRole(@Param('roleId') roleId: string, @CurrentUser() user: any) {
    return this.metadataService.deleteProjectRole(roleId, user?.id);
  }

  // Project Templates
  @Get('templates/projects')
  async getProjectTemplates(@Query('q') q?: string) {
    return this.metadataService.getProjectTemplates(q);
  }

  @Post('templates/projects')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  async createOrUpdateProjectTemplate(
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.metadataService.createOrUpdateProjectTemplate(data, user?.id);
  }
}
