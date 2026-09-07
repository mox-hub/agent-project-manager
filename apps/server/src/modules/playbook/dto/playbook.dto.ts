import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============ 请求 DTO ============

export class MountPlaybookDto {
  @ApiProperty({ description: '内置剧本模板 key' })
  @IsString()
  @MinLength(1)
  playbookRef: string;
}

export class InterviewAnswerDto {
  @ApiProperty({ description: '问题 id（注册表稳定 key）' })
  @IsString()
  @MinLength(1)
  questionId: string;

  @ApiProperty({ description: '用户原话（人话，专业转写在服务端完成）' })
  @IsString()
  answer: string;
}

export class SubmitInterviewDto {
  @ApiProperty({ type: [InterviewAnswerDto], description: '访谈回答' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InterviewAnswerDto)
  answers: InterviewAnswerDto[];
}

export class SkipStageDto {
  @ApiPropertyOptional({
    description: '跳过原因（进事件留痕，验收出问题时 AI 有据可查）',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ============ 响应 DTO ============

export class PlaybookQuestionDto {
  @ApiProperty({ description: '问题 id（注册表稳定 key）' })
  id: string;
  @ApiProperty({ description: '人话提问' })
  question: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  hint?: string;
  @ApiProperty({ type: Boolean })
  required: boolean;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '专业术语对照',
  })
  term?: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '术语解释（知识夹层素材）',
  })
  termNote?: string;
}

export class PlaybookStageTemplateDto {
  @ApiProperty()
  key: string;
  @ApiProperty()
  name: string;
  @ApiProperty({ description: '一句本阶段目的' })
  purpose: string;
  @ApiProperty({ description: '档位领域（专长度向量维度）' })
  domain: string;
  @ApiProperty({ type: [PlaybookQuestionDto] })
  interview: PlaybookQuestionDto[];
  @ApiProperty({ type: Object, additionalProperties: true })
  document: Record<string, unknown>;
  @ApiProperty({ type: Object, additionalProperties: true })
  gate: Record<string, unknown>;
}

export class PlaybookTemplateDto {
  @ApiProperty()
  key: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  description: string;
  @ApiProperty({ enum: ['novice', 'maintenance'] })
  audience: string;
  @ApiProperty({ type: [PlaybookStageTemplateDto] })
  stages: PlaybookStageTemplateDto[];
}

export class PlaybookTemplatesResponseDto {
  @ApiProperty({ description: '注册表版本' })
  version: string;
  @ApiProperty({ type: [PlaybookTemplateDto] })
  templates: PlaybookTemplateDto[];
}

export class PlaybookStageStatusDto {
  @ApiProperty()
  key: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  purpose: string;
  @ApiProperty({ enum: ['done', 'active', 'pending', 'skipped'] })
  status: 'done' | 'active' | 'pending' | 'skipped';
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '完成时间（ISO）',
  })
  completedAt?: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  skippedAt?: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '跳过原因',
  })
  skippedReason?: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '本阶段产出文档',
  })
  documentId?: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  documentTitle?: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '闸门提案 ID（pending 时）',
  })
  gateProposalId?: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    enum: ['pending', 'accepted', 'rejected'],
  })
  gateStatus?: string;
  @ApiProperty({ type: Number, description: '闸门被驳回次数（退回率口径）' })
  gateRejections: number;
}

export class PlaybookStatusResponseDto {
  @ApiProperty()
  projectId: string;
  @ApiProperty({
    type: String,
    nullable: true,
    description: '挂载的模板 key（null=自由模式）',
  })
  playbookRef: string | null;
  @ApiPropertyOptional({
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  template: { key: string; name: string; description: string } | null;
  @ApiProperty({
    type: String,
    nullable: true,
    description: '当前游标（stage key）',
  })
  currentStage: string | null;
  @ApiProperty({ type: [PlaybookStageStatusDto] })
  stages: PlaybookStageStatusDto[];
}

export class GlossaryMappingDto {
  @ApiProperty()
  questionId: string;
  @ApiProperty()
  question: string;
  @ApiProperty()
  answerExcerpt: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  term?: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  termNote?: string;
}

export class SubmitInterviewResponseDto {
  @ApiProperty({ description: '生成的工件文档 ID' })
  documentId: string;
  @ApiProperty()
  documentTitle: string;
  @ApiProperty({ description: '闸门决策提案 ID（去决策收件箱拍板）' })
  proposalId: string;
  @ApiProperty({
    type: [GlossaryMappingDto],
    description: '人话 → 术语对照（前端对照视图）',
  })
  mappings: GlossaryMappingDto[];
}

export class SkipStageResponseDto {
  @ApiProperty({ description: '被跳过的阶段' })
  skippedStage: string;
  @ApiProperty({ type: String, nullable: true, description: '推进后的游标' })
  currentStage: string | null;
}

// 剧本活动事件类型（ getStatus 派生 + dashboard 健康卡共用口径 ）
export const PLAYBOOK_EVENT_TYPES = [
  'playbook_mounted',
  'playbook_stage_completed',
  'playbook_stage_skipped',
  'playbook_gate_rejected',
] as const;

export const GATE_PLAYBOOK_TYPE = 'playbook_gate' as const;

/** DecisionProposal.payload（gate kind）结构 */
export interface PlaybookGatePayload {
  type: typeof GATE_PLAYBOOK_TYPE;
  templateKey: string;
  stage: string;
  documentId?: string;
  documentTitle?: string;
  domain?: string;
  mappings?: GlossaryMappingDto[];
  knowledge?: Array<{ term: string; note: string; questionId: string }>;
  consequences?: string[];
}
