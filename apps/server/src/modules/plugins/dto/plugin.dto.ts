import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  IsEnum,
} from 'class-validator';

export enum PluginProvider {
  GITHUB = 'github',
  GITLAB = 'gitlab',
  BITBUCKET = 'bitbucket',
  JIRA = 'jira',
  LINEAR = 'linear',
  TRELLO = 'trello',
  NOTION = 'notion',
  SLACK = 'slack',
  DISCORD = 'discord',
  CUSTOM = 'custom',
}

export enum PluginScope {
  GLOBAL = 'global',
  PROJECT = 'project',
}

export enum PluginStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISABLED = 'disabled',
  ERROR = 'error',
}

export class CreatePluginDto {
  @ApiProperty({ description: '插件名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '提供方', enum: PluginProvider })
  @IsOptional()
  provider: PluginProvider;

  @ApiPropertyOptional({ description: '作用域', enum: PluginScope })
  @IsOptional()
  scope: PluginScope;

  @ApiPropertyOptional({ description: '项目级插件所属项目 ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({ description: '插件清单' })
  @IsObject()
  manifest: Record<string, any>;

  @ApiPropertyOptional({ description: '权限列表', type: [String] })
  @IsOptional()
  @IsArray()
  permissions?: string[];

  @ApiPropertyOptional({ description: '插件配置' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdatePluginDto {
  @ApiPropertyOptional({ description: '插件名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '插件清单' })
  @IsOptional()
  @IsObject()
  manifest?: Record<string, any>;

  @ApiPropertyOptional({ description: '插件配置' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class PluginQueryDto {
  @ApiPropertyOptional({ description: '按提供方过滤', enum: PluginProvider })
  @IsOptional()
  @IsEnum(PluginProvider)
  provider?: PluginProvider;

  @ApiPropertyOptional({ description: '按作用域过滤', enum: PluginScope })
  @IsOptional()
  @IsEnum(PluginScope)
  scope?: PluginScope;

  @ApiPropertyOptional({ description: '按项目 ID 过滤' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: '按启用状态过滤' })
  @IsOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '名称关键字搜索' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '页码' })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量' })
  @IsOptional()
  pageSize?: number;
}

export class PluginPermissionDto {
  @ApiProperty({ description: '插件 ID' })
  @IsString()
  pluginId: string;

  @ApiProperty({ description: '权限标识' })
  @IsString()
  permission: string;

  @ApiPropertyOptional({ description: '是否授予' })
  @IsOptional()
  @IsBoolean()
  granted?: boolean;
}
