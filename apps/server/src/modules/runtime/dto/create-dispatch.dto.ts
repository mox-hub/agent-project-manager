import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateDispatchDto {
  @ApiProperty({ example: 'runtime-local-001' })
  @IsString()
  runtimeId: string;

  @ApiProperty({ example: 'exec_001' })
  @IsString()
  executionRunId: string;

  @ApiPropertyOptional({ example: 'proj_001' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ example: 'task_001' })
  @IsOptional()
  @IsString()
  taskId?: string;

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
}
