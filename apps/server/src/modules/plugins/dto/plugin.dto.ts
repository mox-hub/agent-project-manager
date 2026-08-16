import { ApiProperty } from '@nestjs/swagger';
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
  @IsString()
  name: string;

  @IsOptional()
  provider: PluginProvider;

  @IsOptional()
  scope: PluginScope;

  @IsOptional()
  projectId?: string;

  @IsObject()
  manifest: Record<string, any>;

  @IsArray()
  permissions?: string[];

  @IsOptional()
  config?: Record<string, any>;

  @IsBoolean()
  enabled?: boolean;
}

export class UpdatePluginDto {
  @IsOptional()
  name?: string;

  @IsOptional()
  manifest?: Record<string, any>;

  @IsOptional()
  config?: Record<string, any>;

  @IsOptional()
  enabled?: boolean;
}

export class PluginQueryDto {
  @IsOptional()
  provider?: PluginProvider;

  @IsOptional()
  scope?: PluginScope;

  @IsOptional()
  projectId?: string;

  @IsOptional()
  enabled?: boolean;

  @IsOptional()
  search?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}

export class PluginPermissionDto {
  @IsString()
  pluginId: string;

  @IsString()
  permission: string;

  @IsOptional()
  granted?: boolean;
}
