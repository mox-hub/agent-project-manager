import { IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** 触发 workflow run（保持原 ai-hub RunWorkflowDto 请求形状兼容） */
export class TriggerWorkflowDto {
  @ApiProperty({ description: '项目 ID（可选上下文）', required: false })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({ description: '工单 ID（可选上下文）', required: false })
  @IsOptional()
  @IsString()
  issueId?: string;

  @ApiProperty({
    description: 'workflow 入参（插值上下文 {input.*} 的来源）',
    required: false,
    type: Object,
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;

  @ApiProperty({ description: '触发方式', example: 'manual', required: false })
  @IsOptional()
  @IsString()
  triggerType?: string;
}

/** 恢复被 suspend 的 workflow run（人工确认结果） */
export class ResumeWorkflowDto {
  @ApiProperty({
    description:
      '恢复数据（human-confirm 步骤的确认结果，如 { approved: true, note: "..." }）',
    type: Object,
    additionalProperties: true,
  })
  @IsObject()
  resumeData!: Record<string, unknown>;
}

export class ListWorkflowRunsQuery {
  @ApiProperty({ description: '按 workflow 定义 id 过滤', required: false })
  @IsOptional()
  @IsString()
  workflowId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  issueId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
