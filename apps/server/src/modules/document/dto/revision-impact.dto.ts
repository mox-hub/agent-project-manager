import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 需求修订影响（CAP-P-01 批一 P0）响应契约：
 * GET  /documents/:documentId/revision-impact         → 状态查询（读取即收敛）
 * POST /documents/:documentId/revision-impact/analyze → 手动触发影响分析
 */

export class RevisionImpactStatusResponseDto {
  @ApiProperty({
    description: '修订影响状态',
    enum: ['none', 'pending_decision', 'applied', 'dismissed'],
  })
  status: 'none' | 'pending_decision' | 'applied' | 'dismissed';

  @ApiPropertyOptional({ description: '关联决策卡（提案）ID', type: String })
  proposalId?: string;

  @ApiPropertyOptional({ description: '受影响任务数', type: Number })
  issueCount?: number;

  @ApiPropertyOptional({ description: '受影响验收标准数', type: Number })
  criteriaCount?: number;

  @ApiPropertyOptional({ description: '影响分析时间（ISO）', type: String })
  analyzedAt?: string;

  @ApiPropertyOptional({
    description: '本次读取收敛时实际置为待复核的标准条数（仅 applied）',
    type: Number,
  })
  appliedCount?: number;

  @ApiPropertyOptional({ description: '补充说明', type: String })
  detail?: string;
}

export class RevisionImpactAnalyzeResponseDto {
  @ApiProperty({
    description: '分析结果',
    enum: ['created', 'skipped', 'not_applicable'],
  })
  status: 'created' | 'skipped' | 'not_applicable';

  @ApiPropertyOptional({
    description: '决策卡（提案）ID（created/skipped 时）',
    type: String,
  })
  proposalId?: string;

  @ApiPropertyOptional({ description: '受影响任务数', type: Number })
  issueCount?: number;

  @ApiPropertyOptional({ description: '受影响验收标准数', type: Number })
  criteriaCount?: number;

  @ApiPropertyOptional({
    description: '未创建原因（not_applicable/skipped）',
    type: String,
  })
  reason?: string;
}
