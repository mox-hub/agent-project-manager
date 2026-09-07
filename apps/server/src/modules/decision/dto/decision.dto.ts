import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 决策收件箱（卡片文法）统一契约：
 * 服务端把各来源（ApprovalRequest / Acceptance，后续可扩 Clarify/Plan 等）
 * 聚合为中性 Decision 投影；卡片文法的五段结构由前端卡壳渲染，
 * 服务端只负责事实与路由策略（urgency）。
 */

export class DecisionProposerDto {
  @ApiProperty({
    description: '提案者类型',
    enum: ['ai_agent', 'human', 'system'],
  })
  type: 'ai_agent' | 'human' | 'system';

  @ApiPropertyOptional({ description: '提案者 ID（成员/用户/执行主体）' })
  id?: string;

  @ApiPropertyOptional({ description: '提案者展示名（可解析时回填）' })
  name?: string;
}

export class DecisionDto {
  @ApiProperty({ description: '决策复合 ID（{kind}:{sourceId}，跨来源唯一）' })
  id: string;

  @ApiProperty({
    description: '决策来源类型',
    enum: [
      'approval',
      'acceptance',
      'plan',
      'assignment',
      'resolution',
      'spend',
      'clarify',
      'gate',
    ],
  })
  kind:
    | 'approval'
    | 'acceptance'
    | 'plan'
    | 'assignment'
    | 'resolution'
    | 'spend'
    | 'clarify'
    | 'gate';

  @ApiProperty({ description: '原始实体 ID' })
  sourceId: string;

  @ApiProperty({ description: '原始状态（pending / in_review / …）' })
  status: string;

  @ApiProperty({ description: '决策主题（审批动作描述 / 待验收任务标题）' })
  title: string;

  @ApiPropertyOptional({
    description: '补充说明（理由 / 执行目标 / 验收描述）',
  })
  detail?: string;

  @ApiProperty({
    description: '紧迫度路由：blocking=执行已暂停等待裁决；advisory=排队判断题',
    enum: ['blocking', 'advisory'],
  })
  urgency: 'blocking' | 'advisory';

  @ApiPropertyOptional({ description: '所属项目 ID' })
  projectId?: string;

  @ApiPropertyOptional({ description: '所属项目名' })
  projectName?: string;

  @ApiPropertyOptional({ description: '关联任务 ID' })
  issueId?: string;

  @ApiPropertyOptional({ description: '关联任务标题' })
  taskTitle?: string;

  @ApiPropertyOptional({
    description: '风险级别（approval：read | write | high_risk）',
  })
  riskLevel?: string;

  @ApiPropertyOptional({
    description: '动作类型（approval：tool_call | git_write | …）',
  })
  actionType?: string;

  @ApiProperty({ type: DecisionProposerDto, description: '提案者' })
  proposer: DecisionProposerDto;

  @ApiProperty({
    description: '来源原始数据（证据抽屉渲染用，键集随 kind 而定）',
    type: Object,
    additionalProperties: true,
  })
  payload: Record<string, unknown>;

  @ApiProperty({ description: '决策发起时间（ISO）' })
  createdAt: string;

  @ApiPropertyOptional({ description: '过期时间（ISO，超时升级不静默通过）' })
  expiresAt?: string;

  @ApiPropertyOptional({ description: '上下文内嵌投影的前端路由' })
  contextPath?: string;
}

export class DecisionListDto {
  @ApiProperty({ type: [DecisionDto], description: '待决决策列表' })
  items: DecisionDto[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '阻断（blocking）数量' })
  blocking: number;

  @ApiProperty({ description: '排队（advisory）数量' })
  advisory: number;
}

export class DecisionSummaryDto {
  @ApiProperty({ description: '待决总数' })
  pending: number;

  @ApiProperty({ description: '阻断数量' })
  blocking: number;

  @ApiProperty({ description: '排队数量' })
  advisory: number;

  @ApiProperty({
    description: '按来源分项计数',
    type: Object,
    additionalProperties: { type: 'number' },
  })
  byKind: Record<string, number>;
}
