import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateDispatchDto {
  @ApiProperty({ example: 'runtime-local-001' })
  @IsString()
  runtimeId: string;

  // 4d-3：executionRunId 可由 executionId（执行项 ID）替代，二者至少传一
  @ApiPropertyOptional({ example: 'exec_001' })
  @IsOptional()
  @IsString()
  executionRunId?: string;

  @ApiPropertyOptional({
    example: 'exec_001',
    description: '绑定既有执行项（Execution.id）；与 executionRunId 二选一',
  })
  @IsOptional()
  @IsString()
  executionId?: string;

  @ApiPropertyOptional({ example: 'proj_001' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ example: 'task_001' })
  @IsOptional()
  @IsString()
  issueId?: string;

  @ApiPropertyOptional({ example: 'task' })
  @IsOptional()
  @IsString()
  subjectType?: string;

  @ApiPropertyOptional({ example: 'task_001' })
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional({ example: 'ctx_001' })
  @IsOptional()
  @IsString()
  contextPackRef?: string;

  @ApiPropertyOptional({ type: [String], example: ['cli.execute'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requestedActions?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['task.read', 'task.write_pending_approval'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  toolScopes?: string[];

  @ApiPropertyOptional({ example: 'not_required_for_read' })
  @IsOptional()
  @IsString()
  approvalState?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  policySnapshot?: Record<string, unknown>;

  // ---- 执行载荷（Phase C：守护进程据此执行，向后兼容可选） ----
  @ApiPropertyOptional({
    example: 'Please implement the login flow...',
    description: '派发给 CLI 的提示词',
  })
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiPropertyOptional({ example: 'E:\\repo', description: '执行工作目录' })
  @IsOptional()
  @IsString()
  workspaceRoot?: string;

  @ApiPropertyOptional({ example: 'claude-code', description: 'CLI provider' })
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiPropertyOptional({
    example: 'claude-sonnet-4-5',
    description: '模型覆盖',
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ type: [String], example: ['Read', 'Write'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedTools?: string[];

  @ApiPropertyOptional({ example: 600000, description: '执行超时（毫秒）' })
  @IsOptional()
  @IsInt()
  @Min(0)
  timeout?: number;
}
