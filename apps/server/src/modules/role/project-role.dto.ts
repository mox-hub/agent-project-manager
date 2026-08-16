import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export const EXECUTION_ROLES = [
  'coder',
  'reviewer',
  'pm',
  'qa',
  'general',
] as const;
export type ExecutionRole = (typeof EXECUTION_ROLES)[number];

export const CLI_PROVIDER_IDS = ['claude-code', 'codex', 'zcode'] as const;
export type CliProviderIdLiteral = (typeof CLI_PROVIDER_IDS)[number];

export class CreateProjectRoleDto {
  @ApiProperty({ description: 'Key（项目内唯一）', example: 'coder' })
  @IsString()
  @MaxLength(64)
  key!: string;

  @ApiProperty({ description: '名称', example: 'Coder' })
  @IsString()
  @MaxLength(128)
  name!: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: EXECUTION_ROLES, default: 'general' })
  @IsIn(EXECUTION_ROLES as unknown as string[])
  @IsOptional()
  executionRole?: ExecutionRole = 'general';

  @ApiPropertyOptional({
    enum: CLI_PROVIDER_IDS,
    description: '默认 CLI Provider（垂直切片派发用）',
  })
  @IsOptional()
  @IsIn(CLI_PROVIDER_IDS as unknown as string[])
  defaultCliProviderId?: CliProviderIdLiteral;

  @ApiPropertyOptional({
    description: '注入到 CLI prompt 的角色提示',
  })
  @IsOptional()
  @IsString()
  promptHint?: string;
}

export class UpdateProjectRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: EXECUTION_ROLES })
  @IsOptional()
  @IsIn(EXECUTION_ROLES as unknown as string[])
  executionRole?: ExecutionRole;

  @ApiPropertyOptional({ enum: CLI_PROVIDER_IDS })
  @IsOptional()
  @IsIn(CLI_PROVIDER_IDS as unknown as string[])
  defaultCliProviderId?: CliProviderIdLiteral;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promptHint?: string;
}
