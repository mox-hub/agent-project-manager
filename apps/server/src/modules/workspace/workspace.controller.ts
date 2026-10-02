import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProperty,
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
import {
  PublicWorkspaceListResponseDto,
  SetPublicWorkspaceListDto,
  WorkspaceCurrentResponseDto,
  WorkspaceListResponseDto,
  WorkspaceRecordResponseDto,
} from './dto/workspace-response.dto';
import { WorkspacePublicSettingsService } from './public-settings.service';
import {
  RestoreBackupResponseDto,
  WorkspaceBackupListResponseDto,
  WorkspaceBackupDto,
} from './dto/backup-response.dto';
import { CreateBackupDto, RestoreBackupDto } from './dto/backup.dto';
import { WorkspaceBackupService } from './backup.service';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';

class CreateWorkspaceDto {
  @ApiProperty({ description: '工作区名称', minLength: 1, maxLength: 40 })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name: string;

  @ApiProperty({ description: '工作区数据库文件路径', minLength: 2 })
  @IsString()
  @MinLength(2)
  path: string;
}

/**
 * 工作区元数据端点（注册表为文件级存储，不经过业务库）。
 * current 仅回显请求头、供启动探测，保持 @Public；
 * 列表与激活需登录（注册表含工作区名与库路径，不向未认证方暴露）；
 * 创建/备份/恢复需默认工作区的 admin 身份
 * （客户端调用时不携带 x-workspace-id，即在默认库校验）。
 *
 * CAP-A-26（2026-10-02 用户裁决）：新增**可配置（默认关）**的公开名单端点——管理员开启后，
 * 未认证方可读 `GET /workspaces/public`（登录页工作区选择）。这是对「不向未认证方暴露」的
 * **显式放开**（非静默）：**仅名称**放开且可关，**库路径 `path` 始终不暴露**。
 */
@ApiTags('Workspaces')
@Controller('workspaces')
export class WorkspaceController {
  constructor(
    private readonly backupService: WorkspaceBackupService,
    private readonly publicSettings: WorkspacePublicSettingsService,
  ) {}
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get()
  @ApiOperation({ summary: '工作区列表（含默认工作区）' })
  @ApiOkResponse({
    type: WorkspaceListResponseDto,
    description: '工作区列表',
  })
  list() {
    return { workspaces: listWorkspaces() };
  }

  @Public()
  @Get('current')
  @ApiOperation({ summary: '当前请求的工作区（由 x-workspace-id 决定）' })
  @ApiOkResponse({
    type: WorkspaceCurrentResponseDto,
    description: '当前工作区 ID',
  })
  current() {
    return { workspaceId: getCurrentWorkspaceId() ?? 'default' };
  }

  /** 公开名单的脱敏投影：只透 id/名称/是否默认，绝不带 path 与时间戳。 */
  private publicWorkspaces() {
    return listWorkspaces().map((w) => ({
      id: w.id,
      name: w.name,
      isDefault: w.isDefault,
    }));
  }

  @Public()
  @Get('public')
  @ApiOperation({
    summary: '公开工作区名单（CAP-A-26；可配置，默认关闭，仅 id/名称）',
  })
  @ApiOkResponse({
    type: PublicWorkspaceListResponseDto,
    description: '开关状态与（开启时的）脱敏工作区名单',
  })
  async publicList(): Promise<PublicWorkspaceListResponseDto> {
    const enabled = await this.publicSettings.isPublicListEnabled();
    // 关闭时返回空名单——即使调用方知道端点存在，也拿不到工作区信息
    return enabled
      ? { enabled: true, workspaces: this.publicWorkspaces() }
      : { enabled: false, workspaces: [] };
  }

  @Put('public-list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '设置是否向未认证方公开工作区名单（管理员；默认关）',
  })
  @ApiOkResponse({
    type: PublicWorkspaceListResponseDto,
    description: '写入后的开关状态与（开启时的）脱敏工作区名单',
  })
  @ApiStandardErrors()
  async setPublicList(
    @Body() dto: SetPublicWorkspaceListDto,
    @Request() req: { user?: { userId?: string; id?: string } },
  ): Promise<PublicWorkspaceListResponseDto> {
    const actorId = req.user?.userId || req.user?.id;
    const enabled = await this.publicSettings.setPublicListEnabled(
      dto.enabled,
      actorId,
    );
    return enabled
      ? { enabled: true, workspaces: this.publicWorkspaces() }
      : { enabled: false, workspaces: [] };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '创建并初始化新工作区（指定目录，复制模板库）' })
  @ApiResponse({ status: 201, description: '工作区已创建' })
  @ApiStandardErrors()
  @ApiCreatedResponse({ type: WorkspaceRecordResponseDto })
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

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post(':id/activate')
  @ApiOperation({ summary: '标记工作区最近打开（前端切换时调用）' })
  @ApiOkResponse({
    type: WorkspaceRecordResponseDto,
    description: '更新 lastOpenedAt 后的工作区记录',
  })
  activate(@Param('id') id: string) {
    const record = activateWorkspace(id);
    if (!record) throw new NotFoundException('工作区不存在');
    return record;
  }

  // ---------------------------------------------------------------- 备份与恢复（CAP-A-03）

  @Post('backups')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      '创建备份（scope=all 全库注册表+全部工作区库；scope=workspace 单区库）',
  })
  @ApiCreatedResponse({
    type: WorkspaceBackupDto,
    description: '备份元信息（含文件清单与大小）',
  })
  @ApiStandardErrors()
  async createBackup(
    @Body() dto: CreateBackupDto,
  ): Promise<WorkspaceBackupDto> {
    return this.backupService.createBackup(dto);
  }

  @Get('backups')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '备份列表（按创建时间倒序）' })
  @ApiOkResponse({
    type: WorkspaceBackupListResponseDto,
    description: '备份列表',
  })
  listBackups(): WorkspaceBackupListResponseDto {
    return { backups: this.backupService.listBackups() };
  }

  @Post('backups/:backupId/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      '恢复备份（强确认：scope=workspace 输工作区名称；scope=all 输 RESTORE ALL；恢复前自动全量备份）',
  })
  @ApiCreatedResponse({
    type: RestoreBackupResponseDto,
    description: '恢复结果（含恢复前自动备份 ID）',
  })
  @ApiStandardErrors()
  async restoreBackup(
    @Param('backupId') backupId: string,
    @Body() dto: RestoreBackupDto,
  ): Promise<RestoreBackupResponseDto> {
    return this.backupService.restoreBackup(backupId, dto);
  }
}
