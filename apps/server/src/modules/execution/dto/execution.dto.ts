import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExecutionRunDto {
  @ApiProperty()
  @IsString()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiProperty({ enum: ['human', 'platform_ai_member', 'external_agent'] })
  @IsEnum(['human', 'platform_ai_member', 'external_agent'])
  subjectType!: string;

  @ApiProperty()
  @IsString()
  subjectId!: string;

  @ApiProperty({ enum: ['internal', 'mcp', 'cli', 'api', 'plugin'] })
  @IsEnum(['internal', 'mcp', 'cli', 'api', 'plugin'])
  identitySource!: string;

  @ApiProperty()
  @IsString()
  goal!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contextSnapshotId?: string;
}

export class UpdateExecutionRunDto {
  @ApiPropertyOptional({
    enum: [
      'draft',
      'planned',
      'in_progress',
      'pending_approval',
      'completed',
      'failed',
      'blocked',
      'superseded',
    ],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  output?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  errorDetail?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class AddExecutionStepDto {
  @ApiProperty()
  @IsString()
  stepType!: string;

  @ApiProperty()
  @IsUUID()
  executionRunId!: string;

  @ApiProperty()
  @IsEnum(['pending', 'running', 'completed', 'failed', 'skipped'])
  status!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsUUID()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;
}

export class CreateArtifactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stepId?: string;

  @ApiProperty({
    enum: [
      'code_diff',
      'command_output',
      'file_path',
      'screenshot',
      'log',
      'report',
    ],
  })
  @IsEnum([
    'code_diff',
    'command_output',
    'file_path',
    'screenshot',
    'log',
    'report',
  ])
  artifactType!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storageRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ExecutionQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjectType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  offset?: number;
}
