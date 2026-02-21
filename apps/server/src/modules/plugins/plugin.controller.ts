import { Controller, Get, Post, Put, Delete, Param, Query, Body } from '@nestjs/common';
import { PluginService } from './plugin.service';
import { CreatePluginDto, UpdatePluginDto, PluginScope } from './dto/plugin.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('plugins')
@Controller('plugins')
export class PluginController {
  constructor(private pluginService: PluginService) {}

  @Get()
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
  findOne(
    @Param('id') id: string,
  ): Promise<any> {
    return this.pluginService.findById(id);
  }

  @Post()
  create(
    @Body() createDto: CreatePluginDto,
  ): Promise<any> {
    return this.pluginService.install(createDto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePluginDto,
  ): Promise<any> {
    return this.pluginService.update(id, updateDto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
  ): Promise<any> {
    return this.pluginService.uninstall(id);
  }

  @Post(':id/permissions/grant')
  grantPermission(
    @Param('id') id: string,
    @Body('permission') permission: string,
  ): Promise<any> {
    return this.pluginService.updatePermission(id, permission, true);
  }

  @Post(':id/permissions/revoke')
  revokePermission(
    @Param('id') id: string,
    @Body('permission') permission: string,
  ): Promise<any> {
    return this.pluginService.updatePermission(id, permission, false);
  }

  @Post(':id/enable')
  enable(
    @Param('id') id: string,
    @Body('enabled') enabled: boolean,
  ): Promise<any> {
    return this.pluginService.update(id, { enabled });
  }

  @Post(':id/disable')
  disable(
    @Param('id') id: string,
    @Body('enabled') enabled: boolean,
    ): Promise<any> {
    return this.pluginService.update(id, { enabled: false });
  }

  @Post(':id/permissions/grant-all')
  grantAllPermissions(
    @Param('id') id: string,
  ): Promise<any> {
    return this.pluginService.grantAllPermissions(id);
  }

  @Post(':id/permissions/revoke-all')
  revokeAllPermissions(
    @Param('id') id: string,
  ): Promise<any> {
    return this.pluginService.revokeAllPermissions(id);
  }
}
