import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** GET /workflows 列表项（投影字段，形状沿用原 ai-hub 契约 + status） */
export class WorkflowSummaryDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String, description: '工作流键（唯一）' })
  key: string;
  @ApiProperty({ type: String }) name: string;
  @ApiPropertyOptional({ type: String, nullable: true, description: '描述' })
  description?: string | null;
  @ApiProperty({ type: Number, description: '版本号' })
  version: number;
}

/** GET /workflows/:id 返回（AIWorkflowDefinition 全行 + 解析后的步骤摘要） */
export class WorkflowDetailDto extends WorkflowSummaryDto {
  @ApiProperty({
    description: '工作流定义文法（workflow.definition.ts）',
    type: Object,
    additionalProperties: true,
  })
  definition: Record<string, unknown>;
  @ApiPropertyOptional({ type: String, nullable: true })
  createdBy?: string | null;
  @ApiProperty({ type: String }) createdAt: string;
  @ApiProperty({ type: String }) updatedAt: string;
}

/** POST /workflows/:id/run 与 /workflow-runs/:id/resume 返回 */
export class WorkflowRunTriggerResponseDto {
  @ApiProperty({ type: String, description: '工作流运行 ID' })
  workflowRunId: string;
  @ApiProperty({
    type: String,
    description:
      '运行状态（pending/running/suspended/succeeded/failed/cancelled）',
  })
  status: string;
}

/** 工作流运行（AIWorkflowRun，含 workflow 摘要） */
export class WorkflowRunDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String, description: '工作流定义 ID' })
  workflowId: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  projectId?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  issueId?: string | null;
  @ApiProperty({ type: String, description: '触发类型' })
  triggerType: string;
  @ApiProperty({ type: String, description: '运行状态' })
  status: string;
  @ApiPropertyOptional({
    description: '输入',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  input?: Record<string, unknown> | null;
  @ApiPropertyOptional({
    description: '输出',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  output?: Record<string, unknown> | null;
  @ApiPropertyOptional({
    description: '步骤状态快照（含 engineRunId 与各步骤结果）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  stepsState?: Record<string, unknown> | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  startedAt?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  finishedAt?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  createdBy?: string | null;
  @ApiProperty({ type: String }) createdAt: string;
  @ApiProperty({ type: String }) updatedAt: string;
  @ApiPropertyOptional({
    description: '所属工作流摘要 { id, key, name }',
    type: Object,
    additionalProperties: true,
  })
  workflow?: Record<string, unknown>;
}

/** GET /workflow-runs 返回（{ data, meta } 分页口径） */
export class WorkflowRunsListResponseDto {
  @ApiProperty({ type: [WorkflowRunDto], description: '运行列表' })
  data: WorkflowRunDto[];
  @ApiProperty({
    description: '分页元信息',
    type: 'object',
    properties: {
      page: { type: 'number' },
      pageSize: { type: 'number' },
      total: { type: 'number' },
      totalPages: { type: 'number' },
    },
    required: ['page', 'pageSize', 'total', 'totalPages'],
  })
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** GET /workflow-runs/:id 返回（run + 人工确认待办信息） */
export class WorkflowRunDetailResponseDto extends WorkflowRunDto {
  @ApiPropertyOptional({
    description:
      'status=suspended 时的人工确认待办（步骤 id / 标题 / 待确认信息）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  waitingApproval?: {
    stepId: string;
    title?: string;
    message: string;
  } | null;
}
