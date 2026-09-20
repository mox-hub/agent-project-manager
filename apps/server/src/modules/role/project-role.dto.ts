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

// ========== 响应 DTO（口径：JSON 序列化后的 Prisma ProjectRoleDefinition 裸数据） ==========

export class ProjectRoleResponseDto {
  @ApiProperty({ description: '角色 ID' })
  id: string;

  @ApiProperty({
    description: '所属项目 ID（全局模板为 null）',
    nullable: true,
    type: String,
  })
  projectId: string | null;

  @ApiProperty({ description: 'Key（项目内唯一）', example: 'coder' })
  key: string;

  @ApiProperty({ description: '名称', example: 'Coder' })
  name: string;

  @ApiProperty({ description: '描述', nullable: true, type: String })
  description: string | null;

  @ApiProperty({ description: '执行角色', enum: EXECUTION_ROLES })
  executionRole: string;

  @ApiProperty({
    description: '绑定的默认 CLI Provider ID',
    nullable: true,
    type: String,
  })
  defaultCliProviderId: string | null;

  @ApiProperty({
    description: '注入到 CLI prompt 的角色行为提示',
    nullable: true,
    type: String,
  })
  promptHint: string | null;

  @ApiProperty({
    description: '默认指派人 ID 列表',
    nullable: true,
    type: 'object',
    additionalProperties: true,
  })
  defaultAssigneeIds?: unknown;

  @ApiProperty({
    description: '扩展元数据',
    nullable: true,
    type: 'object',
    additionalProperties: true,
  })
  metadata?: unknown;
}

/** GET /projects/:projectId/roles —— 项目级 + 全局默认角色 */
export class ProjectRoleListResponseDto {
  @ApiProperty({ description: '项目级角色', type: [ProjectRoleResponseDto] })
  projectRoles: ProjectRoleResponseDto[];

  @ApiProperty({
    description: '全局默认模板角色',
    type: [ProjectRoleResponseDto],
  })
  globalRoles: ProjectRoleResponseDto[];
}

/** POST /projects/:projectId/roles/seed-from-global */
export class SeedProjectRolesResponseDto {
  @ApiProperty({ description: '新创建的项目级角色数量' })
  created: number;

  @ApiProperty({
    description: '新创建的角色列表',
    type: [ProjectRoleResponseDto],
  })
  roles: ProjectRoleResponseDto[];
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
