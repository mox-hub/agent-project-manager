import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateTaskExecutionDto {
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
  })
  @IsObject()
  @IsOptional()
  input?: Record<string, unknown>;

  @ApiProperty({
    description: 'Agent generated plan or caller supplied draft plan',
    example: {
      steps: [
        '读取任务上下文',
        '分析当前依赖',
        '提交状态变更建议',
      ],
    },
    required: false,
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
  })
  @IsObject()
  @IsOptional()
  contextPack?: Record<string, unknown>;

  @ApiProperty({
    description: 'Whether this execution requires human approval before any write action',
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
}
