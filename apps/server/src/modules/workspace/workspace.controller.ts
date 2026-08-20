import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Public } from '@/common/decorators/public.decorator';
import {
  activateWorkspace,
  createWorkspace,
  listWorkspaces,
  WorkspaceCreateError,
} from '@/core/database/workspace-registry.util';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getCurrentWorkspaceId } from '@/core/database/workspace-context';

class CreateWorkspaceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name: string;

  @IsString()
  @MinLength(2)
  path: string;
}

/**
 * 工作区元数据端点（注册表为文件级存储，不经过业务库）。
 * 列表/切换为 @Public；创建需默认工作区的 admin 身份
 * （客户端调用时不携带 x-workspace-id，即在默认库校验）。
 */
@ApiTags('Workspaces')
@Controller('workspaces')
export class WorkspaceController {
  @Public()
  @Get()
  @ApiOperation({ summary: '工作区列表（含默认工作区）' })
  list() {
    return { workspaces: listWorkspaces() };
  }

  @Public()
  @Get('current')
  @ApiOperation({ summary: '当前请求的工作区（由 x-workspace-id 决定）' })
  current() {
    return { workspaceId: getCurrentWorkspaceId() ?? 'default' };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '创建并初始化新工作区（指定目录，复制模板库）' })
  @ApiResponse({ status: 201, description: '工作区已创建' })
  create(@Body() dto: CreateWorkspaceDto) {
    try {
      const record = createWorkspace({ name: dto.name, path: dto.path });
      return record;
    } catch (e) {
      if (e instanceof WorkspaceCreateError) {
        throw new BadRequestException(e.message);
      }
      throw new ConflictException(`创建工作区失败: ${(e as Error).message}`);
    }
  }

  @Public()
  @Post(':id/activate')
  @ApiOperation({ summary: '标记工作区最近打开（前端切换时调用）' })
  activate(@Param('id') id: string) {
    const record = activateWorkspace(id);
    if (!record) throw new NotFoundException('工作区不存在');
    return record;
  }
}
