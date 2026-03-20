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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MetadataService } from './metadata.service';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';

@ApiTags('Metadata')
@Controller('metadata')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  // Tags
  @Get('tags')
  @ApiOperation({ summary: 'Get tags' })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Filter by project ID',
  })
  @ApiQuery({
    name: 'resourceType',
    required: false,
    description: 'Filter by resource type',
  })
  @ApiResponse({ status: 200, description: 'Returns list of tags' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTags(
    @Query('projectId') projectId?: string,
    @Query('resourceType') resourceType?: string,
  ) {
    return this.metadataService.getTags(projectId, resourceType);
  }

  @Post('tags')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'maintainer')
  @ApiOperation({ summary: 'Create or update tag' })
  @ApiResponse({ status: 200, description: 'Tag created/updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createOrUpdateTag(@Body() data: any, @CurrentUser() user: any) {
    return this.metadataService.createOrUpdateTag(data, user?.id, user?.id);
  }

  @Delete('tags/:tagId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'maintainer')
  @ApiOperation({ summary: 'Delete tag' })
  @ApiParam({ name: 'tagId', description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'Tag deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteTag(@Param('tagId') tagId: string, @CurrentUser() user: any) {
    return this.metadataService.deleteTag(tagId, user?.id);
  }

  // Status Definitions
  @Get('statuses')
  @ApiOperation({ summary: 'Get status definitions' })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Filter by project ID',
  })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of status definitions',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStatuses(
    @Query('projectId') projectId?: string,
    @Query('type') type?: string,
  ) {
    return this.metadataService.getStatuses(projectId, type);
  }

  @Post('statuses')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'maintainer')
  @ApiOperation({ summary: 'Create or update status definition' })
  @ApiResponse({
    status: 200,
    description: 'Status created/updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createOrUpdateStatus(@Body() data: any, @CurrentUser() user: any) {
    return this.metadataService.createOrUpdateStatus(data, user?.id);
  }

  @Delete('statuses/:statusId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'maintainer')
  @ApiOperation({ summary: 'Delete status definition' })
  @ApiParam({ name: 'statusId', description: 'Status ID' })
  @ApiResponse({ status: 200, description: 'Status deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteStatus(
    @Param('statusId') statusId: string,
    @CurrentUser() user: any,
  ) {
    return this.metadataService.deleteStatus(statusId, user?.id);
  }

  // Project Roles
  @Get('project-roles')
  @ApiOperation({ summary: 'Get project roles' })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Filter by project ID',
  })
  @ApiResponse({ status: 200, description: 'Returns list of project roles' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProjectRoles(@Query('projectId') projectId?: string) {
    return this.metadataService.getProjectRoles(projectId);
  }

  @Post('project-roles')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'maintainer')
  @ApiOperation({ summary: 'Create or update project role' })
  @ApiResponse({
    status: 200,
    description: 'Project role created/updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createOrUpdateProjectRole(@Body() data: any, @CurrentUser() user: any) {
    return this.metadataService.createOrUpdateProjectRole(data, user?.id);
  }

  @Delete('project-roles/:roleId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'maintainer')
  @ApiOperation({ summary: 'Delete project role' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({
    status: 200,
    description: 'Project role deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteProjectRole(
    @Param('roleId') roleId: string,
    @CurrentUser() user: any,
  ) {
    return this.metadataService.deleteProjectRole(roleId, user?.id);
  }

  // Project Templates
  @Get('templates/projects')
  @ApiOperation({ summary: 'Get project templates' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of project templates',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProjectTemplates(@Query('q') q?: string) {
    return this.metadataService.getProjectTemplates(q);
  }

  @Post('templates/projects')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Create or update project template' })
  @ApiResponse({
    status: 200,
    description: 'Project template created/updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createOrUpdateProjectTemplate(
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.metadataService.createOrUpdateProjectTemplate(data, user?.id);
  }
}
