import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsObject } from 'class-validator';

/**
 * @deprecated AI 执行相关字段已废弃，请使用 ExecutionRun API
 * 将在 v3.0 中移除
 */
export class ClaimTaskDto {
  @ApiProperty({ description: 'AI agent identifier' })
  @IsString()
  aiAgentId: string;

  @ApiPropertyOptional({ description: 'AI execution specification (deprecated)' })
  @IsOptional()
  @IsObject()
  /** @deprecated Use ExecutionRun API instead */
  aiExecutionSpec?: Record<string, unknown>;
}

/**
 * @deprecated AI 建议相关字段已废弃，请使用 ExecutionRun API
 * 将在 v3.0 中移除
 */
export class AiSuggestionDto {
  @ApiProperty({ description: 'AI suggestion payload' })
  @IsObject()
  aiSuggestion: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Optional execution spec attached to suggestion (deprecated)',
  })
  @IsOptional()
  @IsObject()
  /** @deprecated Use ExecutionRun API instead */
  aiExecutionSpec?: Record<string, unknown>;
}

/**
 * @deprecated AI 执行结果相关字段已废弃，请使用 ExecutionRun API
 * 将在 v3.0 中移除
 */
export class AiExecutionResultDto {
  @ApiProperty({ description: 'Execution result payload' })
  @IsObject()
  aiExecutionResult: Record<string, unknown>;

  @ApiProperty({
    description: 'Final execution status',
    enum: ['completed', 'failed'],
  })
  @IsIn(['completed', 'failed'])
  aiExecutionStatus: 'completed' | 'failed';

  @ApiPropertyOptional({ description: 'Error details if failed' })
  @IsOptional()
  @IsString()
  error?: string;
}

export class AiDiscoverQueryDto {
  @ApiProperty({ description: 'Project ID to search within' })
  @IsString()
  projectId: string;

  @ApiPropertyOptional({ description: 'Filter by task status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by priority' })
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priority?: string;
}
