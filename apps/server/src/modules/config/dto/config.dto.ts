import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ConfigScope {
  GLOBAL = 'global',
  PROJECT = 'project',
  USER = 'user',
}

export class GetConfigQueryDto {
  @ApiProperty({
    description: 'Configuration scope',
    enum: ConfigScope,
    example: 'global',
  })
  @IsEnum(ConfigScope)
  scope: 'global' | 'project' | 'user';

  @ApiProperty({
    description: 'Project ID (required for project scope)',
    required: false,
  })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiProperty({
    description: 'User ID (required for user scope)',
    required: false,
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description:
      'Specific config keys to retrieve (optional, returns all if not specified)',
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keys?: string[];
}

export class SetConfigDto {
  @ApiProperty({
    description: 'Configuration scope',
    enum: ConfigScope,
    example: 'global',
  })
  @IsEnum(ConfigScope)
  scope: 'global' | 'project' | 'user';

  @ApiProperty({
    description: 'Project ID (required for project scope)',
    required: false,
  })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiProperty({
    description: 'User ID (required for user scope)',
    required: false,
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description: 'Configuration key-value pairs',
    example: {
      'git.defaultProvider': 'github',
      'git.defaultBranch': 'main',
      'terminal.defaultShell': 'pwsh',
    },
  })
  @IsObject()
  config: Record<string, any>;
}

export class DeleteConfigDto {
  @ApiProperty({
    description: 'Configuration scope',
    enum: ConfigScope,
    example: 'global',
  })
  @IsEnum(ConfigScope)
  scope: 'global' | 'project' | 'user';

  @ApiProperty({
    description: 'Project ID (required for project scope)',
    required: false,
  })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiProperty({
    description: 'User ID (required for user scope)',
    required: false,
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description: 'Config keys to delete',
    type: [String],
    example: ['git.defaultProvider', 'terminal.defaultShell'],
  })
  @IsArray()
  @IsString({ each: true })
  keys: string[];
}
