import { IsString, IsEnum, IsOptional, IsBoolean, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum IntegrationScope {
  GLOBAL = 'global',
  PROJECT = 'project',
}

export class CreateIntegrationConfigDto {
  @IsString()
  provider: string; // 'github' | 'gitlab' | 'jira' | 'linear' | 'slack' | 'discord'

  @IsEnum(IntegrationScope)
  scope: IntegrationScope;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsObject()
  config: Record<string, any>; // API tokens, secrets, etc. (will be encrypted)

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
