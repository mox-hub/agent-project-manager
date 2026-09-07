import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { PluginService } from './plugin.service';
import {
  CreatePluginDto,
  UpdatePluginDto,
  PluginScope,
} from './dto/plugin.dto';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';
import {
  PluginListResponseDto,
  PluginResponseDto,
} from './dto/plugin-response.dto';

@ApiTags('Plugins')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('plugins')
export class PluginController {
  constructor(private pluginService: PluginService) {}

  @Get()
  @ApiOperation({ summary: '获取插件列表' })
  @ApiQuery({ name: 'provider', required: false, description: '插件提供方' })
  @ApiQuery({ name: 'scope', required: false, enum: PluginScope })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'enabled', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiOkResponse({
    type: PluginListResponseDto,
    description: '插件分页列表（{ data, meta: page/pageSize/total }）',
  })
  @ApiStandardErrors()
  findAll(
    @Query('provider') provider?: string,
    @Query('scope') scope?: PluginScope,
    @Query('projectId') projectId?: string,
    @Query('enabled') enabled?: boolean,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ): Promise<any> {
    return this.pluginService.findAll({
      provider,
      scope,
      projectId,
      enabled,
      search,
      page,
      pageSize,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '获取插件详情' })
  @ApiParam({ name: 'id', description: '插件 ID' })
  @ApiOkResponse({
    type: PluginResponseDto,
    description: '插件详情（含权限列表）',
  })
  @ApiStandardErrors()
  findOne(@Param('id') id: string): Promise<any> {
    return this.pluginService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: '安装插件' })
  @ApiCreatedResponse({ type: PluginResponseDto, description: '新安装的插件' })
  @ApiStandardErrors()
  create(@Body() createDto: CreatePluginDto): Promise<any> {
    return this.pluginService.install(createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新插件' })
  @ApiParam({ name: 'id', description: '插件 ID' })
  @ApiOkResponse({ type: PluginResponseDto, description: '更新后的插件' })
  @ApiStandardErrors()
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePluginDto,
  ): Promise<any> {
    return this.pluginService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '卸载插件' })
  @ApiParam({ name: 'id', description: '插件 ID' })
  remove(@Param('id') id: string): Promise<any> {
    return this.pluginService.uninstall(id);
  }

  @Post(':id/permissions/grant')
  @ApiOperation({ summary: '授予插件权限' })
  @ApiParam({ name: 'id', description: '插件 ID' })
  grantPermission(
    @Param('id') id: string,
    @Body('permission') permission: string,
  ): Promise<any> {
    return this.pluginService.updatePermission(id, permission, true);
  }

  @Post(':id/permissions/revoke')
  @ApiOperation({ summary: '撤销插件权限' })
  @ApiParam({ name: 'id', description: '插件 ID' })
  revokePermission(
    @Param('id') id: string,
    @Body('permission') permission: string,
  ): Promise<any> {
    return this.pluginService.updatePermission(id, permission, false);
  }

  @Post(':id/enable')
  @ApiOperation({ summary: '启用插件' })
  @ApiParam({ name: 'id', description: '插件 ID' })
  @ApiOkResponse({ type: PluginResponseDto, description: '启用后的插件' })
  @ApiStandardErrors()
  enable(
    @Param('id') id: string,
    @Body('enabled') enabled: boolean,
  ): Promise<any> {
    return this.pluginService.update(id, { enabled });
  }

  @Post(':id/disable')
  @ApiOperation({ summary: '禁用插件' })
  @ApiParam({ name: 'id', description: '插件 ID' })
  @ApiOkResponse({ type: PluginResponseDto, description: '禁用后的插件' })
  @ApiStandardErrors()
  disable(
    @Param('id') id: string,
    @Body('enabled') enabled: boolean,
  ): Promise<any> {
    return this.pluginService.update(id, { enabled: false });
  }

  @Post(':id/permissions/grant-all')
  @ApiOperation({ summary: '授予插件全部权限' })
  @ApiParam({ name: 'id', description: '插件 ID' })
  grantAllPermissions(@Param('id') id: string): Promise<any> {
    return this.pluginService.grantAllPermissions(id);
  }

  @Post(':id/permissions/revoke-all')
  @ApiOperation({ summary: '撤销插件全部权限' })
  @ApiParam({ name: 'id', description: '插件 ID' })
  revokeAllPermissions(@Param('id') id: string): Promise<any> {
    return this.pluginService.revokeAllPermissions(id);
  }
}
