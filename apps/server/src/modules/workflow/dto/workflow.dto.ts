import {
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** 创建 workflow 定义（CAP-A-12 画布编辑保存） */
export class CreateWorkflowDto {
  @ApiProperty({ description: '唯一 key（kebab-case，冲突 400）' })
  @IsString()
  @Matches(/^[a-z][a-z0-9-]*$/, {
    message: 'key 需为 kebab-case（小写字母开头，仅小写字母/数字/连字符）',
  })
  key!: string;

  @ApiProperty({ description: '名称' })
  @IsString()
  name!: string;

  @ApiProperty({ description: '描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'definition 文法对象（version:1 + steps 数组）',
    type: Object,
    additionalProperties: true,
  })
  @IsObject()
  definition!: Record<string, unknown>;
}

/** 更新 workflow 定义（按 id 定位，definition 变更时 version 自增） */
export class UpdateWorkflowDto {
  @ApiProperty({ description: '名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'definition 文法对象（提供时 version 自增）',
    required: false,
    type: Object,
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  definition?: Record<string, unknown>;
}

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
