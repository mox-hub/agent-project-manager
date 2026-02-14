import { IsString, IsEnum, IsOptional, IsBoolean, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum IntegrationScope {
  GLOBAL = 'global',
  PROJECT = 'project',
}

export class CreateIntegrationConfigDto {
  @ApiProperty({
    description: 'Integration provider',
    example: 'github',
    enum: ['github', 'gitlab', 'jira', 'linear', 'slack', 'discord'],
  })
  @IsString()
  provider: string; // 'github' | 'gitlab' | 'jira' | 'linear' | 'slack' | 'discord'

  @ApiProperty({
    description: 'Integration scope',
    enum: IntegrationScope,
    example: IntegrationScope.PROJECT,
  })
  @IsEnum(IntegrationScope)
  scope: IntegrationScope;

  @ApiProperty({
    description: 'Project ID (required if scope is PROJECT)',
    example: 'project-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    description: 'Integration name',
    example: 'GitHub Production',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Whether the integration is enabled',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({
    description: 'Integration configuration (API tokens, secrets, etc. - will be encrypted)',
    example: { token: 'ghp_xxx', repo: 'owner/repo' },
  })
  @IsObject()
  config: Record<string, any>; // API tokens, secrets, etc. (will be encrypted)

  @ApiProperty({
    description: 'Additional metadata',
    example: { key: 'value' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
