import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { PROFILE_SLOTS, type ProfileSlot } from '../profile-slot.registry';

// ============ 请求 ============

export class CreateProfileAtomDto {
  @ApiProperty({ description: '项目 ID' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: '档案槽位', enum: PROFILE_SLOTS })
  @IsIn(PROFILE_SLOTS as unknown as string[])
  slot: string;

  @ApiProperty({ description: '档案正文（原子：一条一个事实/结论）' })
  @IsString()
  @MinLength(2)
  content: string;

  @ApiPropertyOptional({ description: '置信度 0-1（人写默认 1）' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional({
    description: '关联实体 [{kind,id}]（task/document/execution...）',
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  @IsOptional()
  @IsArray()
  refs?: Array<{ kind: string; id: string }>;
}

export class UpdateProfileAtomDto {
  @ApiProperty({ description: '修正后的正文（生效侧新建原子替换，旧值留痕）' })
  @IsString()
  @MinLength(2)
  content: string;
}

export class RejectProfileAtomDto {
  @ApiPropertyOptional({ description: '驳回原因（进活动流摘要）' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class StartArchaeologyDto {
  @ApiPropertyOptional({
    description: '执行主体 AI 成员 ID（缺省用项目默认 Agent）',
  })
  @IsOptional()
  @IsString()
  memberId?: string;

  @ApiPropertyOptional({
    description: 'CLI 提供方（缺省按成员解析链）',
    enum: ['claude-code', 'codex', 'zcode'],
  })
  @IsOptional()
  @IsIn(['claude-code', 'codex', 'zcode'])
  providerId?: string;
}

// ============ 响应 ============

export class ProfileAtomDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String, description: '所属槽位' })
  slot: string;
  @ApiProperty({
    type: String,
    description: '记忆类型（capability|conclusion）',
  })
  type: string;
  @ApiProperty({ type: String, description: '正文' })
  content: string;
  @ApiProperty({ type: Number, description: '置信度 0-1' })
  confidence: number;
  @ApiProperty({
    type: String,
    description:
      '生命周期：working=草稿 consolidated=生效 archived=已驳回/替换',
  })
  lifecycle: string;
  @ApiPropertyOptional({
    type: String,
    description: 'manual=人写 tool=AI 考古 digest=消化器',
  })
  sourceType?: string;
  @ApiPropertyOptional({
    type: String,
    description: '溯源：产生该原子的事件/执行 ID',
  })
  sourceEventId?: string;
  @ApiProperty({ type: Boolean, description: '是否钉住' })
  pinned: boolean;
  @ApiPropertyOptional({ type: String, description: '被替换指向（替换链）' })
  supersededById?: string;
  @ApiPropertyOptional({ type: String, description: '创建时间（ISO）' })
  createdAt?: string;
  @ApiPropertyOptional({ type: String, description: '最近更新时间（ISO）' })
  updatedAt?: string;
}

export class ProfileSlotGroupDto {
  @ApiProperty({ type: String, description: '槽位 key' })
  slot: string;
  @ApiProperty({ type: String, description: '槽位名' })
  label: string;
  @ApiProperty({ type: String, description: '槽位说明' })
  description: string;
  @ApiProperty({ type: Boolean, description: '完备度：生效原子 ≥ 1' })
  filled: boolean;
  @ApiProperty({ type: [ProfileAtomDto], description: '生效原子' })
  atoms: ProfileAtomDto[];
  @ApiProperty({ type: [ProfileAtomDto], description: '待审草稿（AI 产出）' })
  drafts: ProfileAtomDto[];
  @ApiPropertyOptional({ type: String, description: '最近刷新时间（ISO）' })
  lastRefreshedAt?: string;
}

export class ProfileCompletenessDto {
  @ApiProperty({ type: Number, description: '已填充槽位数' })
  filled: number;
  @ApiProperty({ type: Number, description: '槽位总数' })
  total: number;
}

export class ProfileResponseDto {
  @ApiProperty({ type: String }) projectId: string;
  @ApiProperty({ type: [ProfileSlotGroupDto], description: '按槽位分组' })
  slots: ProfileSlotGroupDto[];
  @ApiProperty({ type: ProfileCompletenessDto })
  completeness: ProfileCompletenessDto;
}

export class ProfileSchemaSlotDto {
  @ApiProperty({ type: String, description: '槽位 key' })
  key: string;
  @ApiProperty({ type: String }) label: string;
  @ApiProperty({ type: String }) description: string;
  @ApiProperty({ type: String, description: '原子记忆类型' })
  atomType: string;
}

export class ProfileSchemaResponseDto {
  @ApiProperty({ type: String, description: '注册表版本' })
  version: string;
  @ApiProperty({
    type: [ProfileSchemaSlotDto],
    description: '内置槽位（只读）',
  })
  slots: ProfileSchemaSlotDto[];
}

export class ArchaeologyStartResponseDto {
  @ApiProperty({
    type: String,
    description: '考古内部 issue ID（进度与留痕容器）',
  })
  issueId: string;
  @ApiProperty({
    type: String,
    description: '执行项 ID（轮询 GET /execution/runs/:id/events）',
  })
  executionId: string;
  @ApiPropertyOptional({ type: String, description: '派发警告（如审计黄牌）' })
  auditWarning?: string;
}

export class ArchaeologyIngestResponseDto {
  @ApiProperty({ type: Number, description: '新建草稿数' })
  created: number;
  @ApiProperty({ type: Number, description: '去重跳过数' })
  skipped: number;
  @ApiProperty({
    type: [ProfileAtomDto],
    description: '落库的草稿原子（lifecycle=working，待人批准）',
  })
  atoms: ProfileAtomDto[];
}

export class ProfileBriefingDto {
  @ApiProperty({ type: String }) projectId: string;
  @ApiProperty({ type: ProfileCompletenessDto })
  completeness: ProfileCompletenessDto;
  @ApiProperty({
    type: Object,
    additionalProperties: true,
    description: '事实现查：issue 计数/在途执行/最近活动（纯派生，每次现查）',
  })
  facts: Record<string, unknown>;
  @ApiProperty({ type: [ProfileAtomDto], description: '生效档案原子' })
  atoms: ProfileAtomDto[];
}

/** 槽位 key 联合类型（开放枚举描述，schema 面用） */
export const PROFILE_SLOT_KEYS: ProfileSlot[] = [...PROFILE_SLOTS];
