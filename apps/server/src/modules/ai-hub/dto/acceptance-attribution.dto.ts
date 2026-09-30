import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============ 验收归因成本（CAP-C-06「成本归因到验收」，G8 缺口兑现）============

export class AcceptanceAttributionQueryDto {
  @ApiProperty({
    description: '按项目 ID 过滤（缺省为当前工作区全量）',
    example: 'project-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;
}

/** 验收单维度成本明细（byAcceptance 项，按成本降序） */
export class AcceptanceAttributionItemDto {
  @ApiProperty({ type: String, description: '验收单 ID' })
  acceptanceId: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '验收单标题（未设置时为 null，前端回落工单标题）',
  })
  acceptanceTitle?: string | null;

  @ApiProperty({ type: String, description: '关联工单 ID' })
  issueId: string;

  @ApiProperty({
    type: String,
    description: '工单标题（工单已删除时为占位文案）',
  })
  issueTitle: string;

  @ApiProperty({
    type: String,
    description: '工单类型名（IssueType.name 事实源，缺省回落 legacy type）',
  })
  issueTypeName: string;

  @ApiProperty({
    type: Number,
    description: '归因成本（USD，该工单执行链 AIUsageLog.estimatedCost 合计）',
  })
  cost: number;

  @ApiProperty({ type: Number, description: '有用量记录的执行次数' })
  executionCount: number;

  @ApiProperty({
    type: Number,
    description: '返工执行次数（Execution.retryOfId 血缘非空）',
  })
  reworkCount: number;
}

/** 按工单类型聚合的返工分布（byIssueType 项，按返工次数降序） */
export class IssueTypeReworkDto {
  @ApiProperty({
    type: String,
    description: '工单类型名（无工单关联的执行归入「未关联工单」）',
  })
  issueTypeName: string;

  @ApiProperty({ type: Number, description: '返工执行次数' })
  reworkCount: number;

  @ApiProperty({ type: Number, description: '归因成本合计（USD）' })
  cost: number;
}

/** GET /ai/usage/acceptance-attribution 返回 */
export class AcceptanceAttributionResponseDto {
  @ApiProperty({
    type: Number,
    description:
      '执行链成本合计（挂 executionRunId 的 AIUsageLog.estimatedCost 合计）',
  })
  totalExecutionCost: number;

  @ApiProperty({
    type: Number,
    description: '返工成本合计（retry 血缘执行关联的成本）',
  })
  reworkCost: number;

  @ApiProperty({
    type: Number,
    description:
      '返工占比百分数（reworkCost/totalExecutionCost×100；无成本时为 0）',
  })
  reworkPct: number;

  @ApiProperty({
    type: Number,
    description: '有验收单的工单数（经执行链成本归因可达的工单）',
  })
  acceptanceCount: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      '单位验收成本（totalExecutionCost/acceptanceCount；无验收单时为 null，前端显示诚实空态）',
  })
  avgCostPerAcceptance: number | null;

  @ApiProperty({
    type: [AcceptanceAttributionItemDto],
    description: '验收单维度明细（按成本降序，上限 50）',
  })
  byAcceptance: AcceptanceAttributionItemDto[];

  @ApiProperty({
    type: [IssueTypeReworkDto],
    description: '工单类型返工分布（按返工次数降序，上限 10）',
  })
  byIssueType: IssueTypeReworkDto[];
}
