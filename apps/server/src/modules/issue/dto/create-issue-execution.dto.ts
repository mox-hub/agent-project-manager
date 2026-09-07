import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateIssueExecutionDto {
  @ApiProperty({
    description: 'Execution goal',
    example: '根据当前任务上下文生成执行计划，并准备状态更新草稿',
    required: false,
  })
  @IsString()
  @IsOptional()
  goal?: string;

  @ApiProperty({
    description: 'Agent input payload',
    example: { requestedBy: 'task-detail-drawer' },
    required: false,
    type: Object,
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  input?: Record<string, unknown>;

  @ApiProperty({
    description: 'Agent generated plan or caller supplied draft plan',
    example: {
      steps: ['读取任务上下文', '分析当前依赖', '提交状态变更建议'],
    },
    required: false,
    type: Object,
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  plan?: Record<string, unknown>;

  @ApiProperty({
    description: 'Optional precomputed context pack',
    example: {
      sources: ['project', 'task', 'activities'],
    },
    required: false,
    type: Object,
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  contextPack?: Record<string, unknown>;

  @ApiProperty({
    description:
      'Whether this execution requires human approval before any write action',
    example: true,
    required: false,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;

  @ApiProperty({
    description: 'Approval action type',
    example: 'task.write',
    required: false,
  })
  @IsString()
  @IsOptional()
  actionType?: string;

  @ApiProperty({
    description: 'Approval reason',
    example: '需要对任务状态和执行说明进行写回',
    required: false,
  })
  @IsString()
  @IsOptional()
  approvalReason?: string;

  // ── 4d: 统一执行项字段（subjectType=human 时启用；AI 派发流不受影响）──

  @ApiProperty({
    description: '执行主体类型：human=人工执行（统一执行项）；缺省=AI 派发流',
    enum: ['human', 'ai'],
    required: false,
  })
  @IsEnum(['human', 'ai'])
  @IsOptional()
  subjectType?: 'human' | 'ai';

  @ApiProperty({ description: '执行项标题（human 必填）', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: '执行项描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: '执行人 Member.id（V3 身份口径，human 必填）',
    required: false,
  })
  @IsString()
  @IsOptional()
  subjectId?: string;

  @ApiProperty({ description: '预估工时（分钟）', required: false })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  estimate?: number;

  @ApiProperty({ description: 'issue 内排序权重', required: false })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiProperty({
    description: '协作人 Member.id 列表（metadata 留档，不进状态机）',
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  collaborators?: string[];
}
