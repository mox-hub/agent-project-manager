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
  ApiOkResponse,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MetadataService } from './metadata.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';
import {
  ProjectRoleDto,
  ProjectTemplateDto,
  StatusDefinitionDto,
  TagDto,
} from './dto/metadata-response.dto';

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
  @ApiOkResponse({ type: [TagDto], description: '标签列表（按名称排序）' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiStandardErrors()
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
  @ApiOkResponse({ type: TagDto, description: '创建/更新后的标签（幂等）' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiStandardErrors()
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
  @ApiOkResponse({
    type: [StatusDefinitionDto],
    description: '状态定义列表（按 order 排序）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiStandardErrors()
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
  @ApiOkResponse({
    type: StatusDefinitionDto,
    description: '创建/更新后的状态定义（幂等）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiStandardErrors()
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
  @ApiOkResponse({ type: [ProjectRoleDto], description: '项目角色列表' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiStandardErrors()
  async getProjectRoles(@Query('projectId') projectId?: string) {
    return this.metadataService.getProjectRoles(projectId);
  }

  @Post('project-roles')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'maintainer')
  @ApiOperation({ summary: 'Create or update project role' })
  @ApiOkResponse({
    type: ProjectRoleDto,
    description: '创建/更新后的项目角色（幂等）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiStandardErrors()
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
  @ApiOkResponse({
    type: [ProjectTemplateDto],
    description: '项目模板列表',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiStandardErrors()
  async getProjectTemplates(@Query('q') q?: string) {
    return this.metadataService.getProjectTemplates(q);
  }

  @Post('templates/projects')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Create or update project template' })
  @ApiOkResponse({
    type: ProjectTemplateDto,
    description: '创建/更新后的项目模板',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiStandardErrors()
  async createOrUpdateProjectTemplate(
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.metadataService.createOrUpdateProjectTemplate(data, user?.id);
  }
}
