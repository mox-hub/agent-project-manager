import {
  IsString,
  IsOptional,
  IsInt,
  IsIn,
  IsArray,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CLI_PROVIDER_IDS } from '@/modules/cli-provider/dto/configure-cli-provider.dto';
import { EXECUTION_ROLES } from '@/modules/role/project-role.dto';

/** AI 成员思考强度档位 */
export const THINKING_LEVELS = [
  'minimal',
  'low',
  'medium',
  'high',
  'max',
] as const;

export class CreateMemberDto {
  @ApiProperty({ enum: ['human', 'ai_agent'], default: 'human' })
  @IsIn(['human', 'ai_agent'])
  @IsOptional()
  type?: string = 'human';

  @ApiProperty()
  @IsString()
  displayName: string;

  @ApiProperty({
    description: '@handle, unique',
    example: 'alice',
    required: false,
  })
  @IsString()
  @IsOptional()
  handle?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ required: false, description: '职务' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false, description: '描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, description: '标签', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ required: false, description: '信任等级 0-4' })
  @IsInt()
  @Min(0)
  @Max(4)
  @IsOptional()
  trustLevel?: number;

  @ApiProperty({ required: false, description: '信任分 0-100' })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  trustScore?: number;

  @ApiProperty({
    required: false,
    description: '个人提示词（注入派发/聊天上下文）',
  })
  @IsString()
  @IsOptional()
  personalPrompt?: string;

  @ApiProperty({
    required: false,
    enum: THINKING_LEVELS,
    description: '思考强度（AI 成员）',
  })
  @IsOptional()
  @IsIn(THINKING_LEVELS as unknown as string[])
  thinkingLevel?: string;

  @ApiProperty({
    required: false,
    description: '日费率（分，团队统计人天成本）',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  costRatePerDay?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  aiModelConfigId?: string;

  @ApiProperty({
    required: false,
    enum: CLI_PROVIDER_IDS,
    description: 'AI 员工级默认 CLI Provider（覆盖项目级角色）',
  })
  @IsOptional()
  @IsIn(CLI_PROVIDER_IDS as unknown as string[])
  defaultCliProviderId?: string;

  @ApiProperty({
    required: false,
    enum: EXECUTION_ROLES,
    description: 'AI 员工默认执行角色',
  })
  @IsOptional()
  @IsIn(EXECUTION_ROLES as unknown as string[])
  defaultExecutionRole?: string;

  @ApiProperty({
    required: false,
    type: Object,
    additionalProperties: true,
  })
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty({ required: false, enum: ['active', 'inactive', 'suspended'] })
  @IsIn(['active', 'inactive', 'suspended'])
  @IsOptional()
  status?: string = 'active';
}

export class UpdateMemberDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ required: false, description: '职务' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false, description: '描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, description: '标签', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ required: false, description: '信任等级 0-4' })
  @IsInt()
  @Min(0)
  @Max(4)
  @IsOptional()
  trustLevel?: number;

  @ApiProperty({ required: false, description: '信任分 0-100' })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  trustScore?: number;

  @ApiProperty({ required: false, description: '个人提示词' })
  @IsString()
  @IsOptional()
  personalPrompt?: string;

  @ApiProperty({
    required: false,
    enum: THINKING_LEVELS,
    description: '思考强度（AI 成员）',
  })
  @IsOptional()
  @IsIn(THINKING_LEVELS as unknown as string[])
  thinkingLevel?: string;

  @ApiProperty({ required: false, description: '日费率（分）' })
  @IsInt()
  @Min(0)
  @IsOptional()
  costRatePerDay?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  aiModelConfigId?: string;

  @ApiProperty({ required: false, enum: CLI_PROVIDER_IDS })
  @IsOptional()
  @IsIn(CLI_PROVIDER_IDS as unknown as string[])
  defaultCliProviderId?: string;

  @ApiProperty({ required: false, enum: EXECUTION_ROLES })
  @IsOptional()
  @IsIn(EXECUTION_ROLES as unknown as string[])
  defaultExecutionRole?: string;

  @ApiProperty({
    required: false,
    type: Object,
    additionalProperties: true,
  })
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty({ required: false, enum: ['active', 'inactive', 'suspended'] })
  @IsIn(['active', 'inactive', 'suspended'])
  @IsOptional()
  status?: string;
}

export class MemberQueryDto {
  @ApiProperty({ enum: ['human', 'ai_agent'], required: false })
  @IsIn(['human', 'ai_agent'])
  @IsOptional()
  type?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  teamId?: string;

  @ApiProperty({ enum: ['active', 'inactive', 'suspended'], required: false })
  @IsIn(['active', 'inactive', 'suspended'])
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  limit?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  offset?: number;
}

export class BindMemberProjectDto {
  @ApiProperty()
  @IsString()
  projectId: string;

  @ApiProperty({ enum: ['owner', 'maintainer', 'member', 'guest'] })
  @IsIn(['owner', 'maintainer', 'member', 'guest'])
  @IsOptional()
  role?: string = 'member';
}

export class MemberToolGrantConfigDto {
  @ApiPropertyOptional({
    description: '模型覆盖（cli_tool 行）；缺省=回落该 CLI 默认配置',
  })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({
    description: '思考强度覆盖（cli_tool 行）；minimal|low|medium|high|max',
  })
  @IsIn(['minimal', 'low', 'medium', 'high', 'max'])
  @IsOptional()
  thinkingLevel?: string;
}

export class MemberToolGrantItemDto {
  @ApiProperty({ enum: ['cli_tool', 'mcp_server', 'skill'] })
  @IsIn(['cli_tool', 'mcp_server', 'skill'])
  scope: string;

  @ApiProperty({
    description: '授权对象键（providerId / MCP 配置 id / 技能 key）',
  })
  @IsString()
  refKey: string;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  granted?: boolean = true;

  @ApiPropertyOptional({
    description:
      '授权配置（仅 cli_tool 行有意义）：{ model?, thinkingLevel? }，空/缺省=回落 CLI 默认配置',
    type: MemberToolGrantConfigDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MemberToolGrantConfigDto)
  config?: MemberToolGrantConfigDto | null;
}

export class SetMemberToolGrantsDto {
  @ApiProperty({
    type: [MemberToolGrantItemDto],
    description: '全量覆盖的授权清单',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MemberToolGrantItemDto)
  items: MemberToolGrantItemDto[];
}
