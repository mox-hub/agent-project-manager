import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsObject } from 'class-validator';

export class ClaimTaskDto {
  @ApiProperty({ description: 'AI agent identifier' })
  @IsString()
  aiAgentId: string;

  @ApiPropertyOptional({ description: 'AI execution specification' })
  @IsOptional()
  @IsObject()
  aiExecutionSpec?: Record<string, unknown>;
}

export class AiSuggestionDto {
  @ApiProperty({ description: 'AI suggestion payload' })
  @IsObject()
  aiSuggestion: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Optional execution spec attached to suggestion' })
  @IsOptional()
  @IsObject()
  aiExecutionSpec?: Record<string, unknown>;
}

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
