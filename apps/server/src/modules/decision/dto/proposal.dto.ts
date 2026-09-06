import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/** 建议类决策卡 kind（与 DecisionProposal.kind 对齐） */
export const PROPOSAL_KINDS = [
  'plan',
  'assignment',
  'resolution',
  'spend',
  'clarify',
] as const;

export class CreateProposalDto {
  @ApiProperty({ description: '提案类型', enum: PROPOSAL_KINDS })
  @IsIn(PROPOSAL_KINDS as unknown as string[])
  kind: string;

  @ApiProperty({ description: '决策陈述（一句话问句）' })
  @IsString()
  title: string;

  @ApiProperty({
    description:
      '提案数据（结构随 kind 而定，见 docs/roadmap/decision-cards-roadmap.md）',
    type: Object,
    additionalProperties: true,
  })
  @IsObject()
  payload: Record<string, unknown>;

  @ApiPropertyOptional({ description: '补充说明（证据抽屉用）' })
  @IsOptional()
  @IsString()
  detail?: string;

  @ApiPropertyOptional({ description: '所属项目' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: '关联任务' })
  @IsOptional()
  @IsString()
  issueId?: string;

  @ApiPropertyOptional({
    description: '提案者类型',
    enum: ['ai_agent', 'human', 'system'],
  })
  @IsOptional()
  @IsIn(['ai_agent', 'human', 'system'])
  proposerType?: string;

  @ApiPropertyOptional({ description: '提案者 ID（供名称回填与答案轮询）' })
  @IsOptional()
  @IsString()
  proposerId?: string;

  @ApiPropertyOptional({ description: '过期时间（ISO，超时升级不静默通过）' })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class ResolveProposalDto {
  @ApiProperty({
    description:
      '决议动作：accept=接受并执行 applier；reject=驳回（reason 必填）；cancel=仅 resolution 关闭语义用',
    enum: ['accept', 'reject', 'cancel'],
  })
  @IsIn(['accept', 'reject', 'cancel'])
  action: 'accept' | 'reject' | 'cancel';

  @ApiPropertyOptional({
    description: '原因（reject 必填，留痕 resolutionNote）',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: '答案（clarify：所选选项，供提案方轮询取回）',
  })
  @IsOptional()
  @IsString()
  answer?: string;
}

export class GenerateAssignmentDto {
  @ApiProperty({ description: '项目 ID' })
  @IsString()
  projectId: string;
}

export class PlanSubtaskDto {
  @ApiProperty({ description: '子任务标题' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: '子任务描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '估时（小时）' })
  @IsOptional()
  @IsInt()
  estimate?: number;

  @ApiPropertyOptional({ description: '分派成员 ID（写入 IssueAssignee）' })
  @IsOptional()
  @IsString()
  assigneeMemberId?: string;
}

export class PlanProposalPayloadDto {
  @ApiProperty({ description: '父任务 ID（子任务挂其下）' })
  @IsString()
  issueId: string;

  @ApiProperty({ type: [PlanSubtaskDto], description: '拆解出的子任务' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanSubtaskDto)
  added: PlanSubtaskDto[];

  @ApiPropertyOptional({
    type: [Object],
    description: '被替换的现有任务（仅作展示上下文）',
  })
  @IsOptional()
  @IsArray()
  removed?: Array<Record<string, unknown>>;
}

export class AssignmentItemDto {
  @ApiProperty({ description: '任务 ID' })
  @IsString()
  issueId: string;

  @ApiProperty({ description: '分派成员 ID' })
  @IsString()
  memberId: string;
}

export class AssignmentProposalPayloadDto {
  @ApiProperty({ type: [AssignmentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignmentItemDto)
  assignments: AssignmentItemDto[];
}

export class ResolutionProposalPayloadDto {
  @ApiProperty({ enum: ['task', 'milestone'] })
  @IsIn(['task', 'milestone'])
  entityType: string;

  @ApiProperty({ description: '实体 ID' })
  @IsString()
  entityId: string;
}

export class SpendProposalPayloadDto {
  @ApiProperty({ description: '周期键（ISO 周，如 2026-W36）' })
  @IsString()
  periodKey: string;

  @ApiPropertyOptional({ description: '已耗 token' })
  @IsOptional()
  @IsInt()
  spentTokens?: number;

  @ApiPropertyOptional({ description: 'token 预算' })
  @IsOptional()
  @IsInt()
  budgetTokens?: number;

  @ApiPropertyOptional({ description: '已耗成本（USD）' })
  @IsOptional()
  @IsInt()
  spentCostUsd?: number;

  @ApiPropertyOptional({ description: '成本预算（USD）' })
  @IsOptional()
  @IsInt()
  budgetCostUsd?: number;
}

export class ClarifyProposalPayloadDto {
  @ApiProperty({ description: '问题' })
  @IsString()
  question: string;

  @ApiProperty({
    type: [Object],
    description:
      '选项 [{ key, label, sub? }]，首项标记 AI 最佳猜测 guess: true',
    additionalProperties: true,
  })
  @IsArray()
  choices: Array<Record<string, unknown>>;
}

export class ResolveProposalResponseDto {
  @ApiProperty({ description: '提案 ID' })
  id: string;

  @ApiProperty({ description: '决议后状态', enum: ['accepted', 'rejected'] })
  status: string;

  @ApiProperty({
    description: '决议落痕',
    type: Object,
    additionalProperties: true,
  })
  resolution: Record<string, unknown>;
}
