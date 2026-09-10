import {
  ArrayMinSize,
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
  'gate',
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

export class PlanCriteriaDto {
  @ApiProperty({ description: '标准类型', enum: ['functional', 'technical'] })
  @IsIn(['functional', 'technical'])
  criteriaType: 'functional' | 'technical';

  @ApiProperty({ description: '标准内容（可检查的完成条件）' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: '分类（如 API/日志/安全）' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '权重（默认 1）' })
  @IsOptional()
  @IsInt()
  weight?: number;

  @ApiPropertyOptional({
    description: '严重度',
    enum: ['low', 'medium', 'high', 'critical'],
  })
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  severity?: string;
}

export class PlanAcceptanceDto {
  @ApiPropertyOptional({ description: '验收单标题（缺省「验收 - {任务名}」）' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: '完成物类型（缺省 artifact）',
    enum: ['pr', 'test_report', 'document', 'artifact'],
  })
  @IsOptional()
  @IsIn(['pr', 'test_report', 'document', 'artifact'])
  completionType?: string;

  @ApiProperty({
    type: [PlanCriteriaDto],
    description:
      '验收标准（组合件落库时 source 记 ai-generated-from-interview）',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PlanCriteriaDto)
  criteria: PlanCriteriaDto[];
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

  @ApiPropertyOptional({
    description: '该任务的验收单（CAP-P-01 组合件：accept 后与任务同事务落库）',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PlanAcceptanceDto)
  acceptance?: PlanAcceptanceDto;
}

export class PlanProposalPayloadDto {
  @ApiPropertyOptional({
    description:
      '父任务 ID（子任务挂其下）；缺省时为组合件语义——added 以顶级任务族落库，要求提案带 projectId',
  })
  @IsOptional()
  @IsString()
  issueId?: string;

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

/** Prisma DecisionProposal（JSON 序列化形态）：创建/详情/内置生成器共用返回 */
export class ProposalResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: '提案类型', enum: PROPOSAL_KINDS })
  kind: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  projectId: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  issueId: string | null;

  @ApiProperty({ description: '决策陈述' })
  title: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  detail: string | null;

  @ApiProperty({
    description: '提案数据（结构随 kind 而定）',
    type: Object,
    additionalProperties: true,
  })
  payload: Record<string, unknown>;

  @ApiProperty({
    description: '提案状态',
    enum: ['pending', 'accepted', 'rejected', 'expired', 'cancelled'],
  })
  status: string;

  @ApiProperty({
    description: '提案者类型',
    enum: ['ai_agent', 'human', 'system'],
  })
  proposerType: string;

  @ApiPropertyOptional({
    description: '提案者 ID',
    type: String,
    nullable: true,
  })
  proposerId: string | null;

  @ApiPropertyOptional({
    description: '决议落痕 { action, reason?, answer? }（未决议为 null）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  resolution: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: '决议人 ID',
    type: String,
    nullable: true,
  })
  resolvedBy: string | null;

  @ApiPropertyOptional({
    description: '决议时间（ISO，未决议为 null）',
    type: String,
    nullable: true,
  })
  resolvedAt: string | null;

  @ApiPropertyOptional({
    description: '过期时间（ISO，未设置为 null）',
    type: String,
    nullable: true,
  })
  expiresAt: string | null;

  @ApiProperty({ description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ description: '更新时间（ISO）' })
  updatedAt: string;
}

/** POST decisions/proposals/watch/spend 返回 */
export class WatchSpendResponseDto {
  @ApiProperty({ example: true })
  ok: boolean;
}
