import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/** 协作卡状态机（交接试点）：requested → committed → delivered → verified */
export const COLLABORATION_STATUSES = [
  'requested',
  'committed',
  'in_progress',
  'delivered',
  'verified',
  'rejected',
  'cancelled',
  'escalated',
] as const;

/** 澄清轮次上限：超出自动升级 decisions 由人拍板（防澄清死循环） */
export const CLARIFY_ROUND_LIMIT = 2;

export class CreateCollaborationDto {
  @ApiProperty({ description: '项目 ID' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: '协作标题（如"需要 POST /api/exports 端点"）' })
  @IsString()
  @MinLength(4)
  title: string;

  @ApiProperty({ description: '提供方成员 ID（后端 AI）' })
  @IsString()
  providerMemberId: string;

  @ApiProperty({ description: '请求方成员 ID（前端 AI）' })
  @IsString()
  requesterMemberId: string;

  @ApiPropertyOptional({ description: '关联任务 ID' })
  @IsOptional()
  @IsString()
  relatedTaskId?: string;

  @ApiProperty({
    description:
      '结构化负载 { endpointShape, sourceFlow, targetSpec, relatedCode, acceptance }',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  payload: Record<string, unknown>;
}

export class RespondCollaborationDto {
  @ApiProperty({
    description: '提供方答复：committed=承诺 / rejected=拒绝 / clarify=需澄清',
    enum: ['committed', 'rejected', 'clarify'],
  })
  @IsIn(['committed', 'rejected', 'clarify'])
  decision: 'committed' | 'rejected' | 'clarify';

  @ApiPropertyOptional({
    description: '答复说明（承诺口径/拒绝理由/澄清问题）',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: '答复方成员 ID（缺省用提供方）' })
  @IsOptional()
  @IsString()
  byMemberId?: string;
}

export class VerifyCollaborationDto {
  @ApiProperty({
    description: '验证结论：verified=契约绿通过 / changes_requested=打回重做',
    enum: ['verified', 'changes_requested'],
  })
  @IsIn(['verified', 'changes_requested'])
  verdict: 'verified' | 'changes_requested';

  @ApiPropertyOptional({ description: '验证说明（联调结果/打回原因）' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CollaborationEventDto {
  @ApiProperty({ description: '流转后状态' })
  status: string;

  @ApiPropertyOptional({ description: '操作方成员 ID' })
  byMemberId?: string;

  @ApiPropertyOptional({ description: '说明/理由' })
  note?: string;

  @ApiProperty({ description: '流转时间（ISO）' })
  at: string;
}

export class CollaborationCardDto {
  @ApiProperty() id: string;
  @ApiProperty() projectId: string;
  @ApiProperty() title: string;
  @ApiProperty({ description: '请求方成员 ID（前端 AI）' })
  requesterMemberId: string;
  @ApiProperty({ description: '提供方成员 ID（后端 AI）' })
  providerMemberId: string;
  @ApiPropertyOptional({ description: '关联任务 ID' })
  relatedTaskId?: string;
  @ApiProperty({
    description: '结构化负载',
    type: Object,
    additionalProperties: true,
  })
  payload: Record<string, unknown>;
  @ApiProperty({ description: '状态', enum: COLLABORATION_STATUSES })
  status: string;
  @ApiProperty({ description: '澄清轮次' })
  rounds: number;
  @ApiPropertyOptional({
    type: [CollaborationEventDto],
    description: '流转日志',
  })
  events?: Array<{
    status: string;
    byMemberId?: string;
    note?: string;
    at: string;
  }>;
  @ApiProperty({ description: '创建时间（ISO）' })
  createdAt: string;
  @ApiProperty({ description: '更新时间（ISO）' })
  updatedAt: string;
}

/** 列表项附成员展示名（办公室页/收件箱渲染用） */
export class CollaborationCardWithNamesDto extends CollaborationCardDto {
  @ApiPropertyOptional({ description: '请求方展示名' })
  requesterName?: string;
  @ApiPropertyOptional({ description: '提供方展示名' })
  providerName?: string;
}
