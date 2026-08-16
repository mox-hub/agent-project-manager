import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApprovalRequestDto {
  @ApiProperty()
  @IsString()
  executionRunId!: string;

  @ApiProperty()
  @IsString()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiProperty()
  @IsString()
  requestedAction!: string;

  @ApiProperty({
    enum: [
      'tool_call',
      'git_write',
      'terminal_exec',
      'external_sync',
      'status_change',
    ],
  })
  @IsEnum([
    'tool_call',
    'git_write',
    'terminal_exec',
    'external_sync',
    'status_change',
  ])
  actionType!: string;

  @ApiProperty({ enum: ['read', 'write', 'high_risk'] })
  @IsEnum(['read', 'write', 'high_risk'])
  riskLevel!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  approverPolicy?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class ResolveApprovalDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsEnum(['approved', 'rejected'])
  resolution!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolutionNote?: string;
}

export class ApprovalQueryDto {
  @ApiPropertyOptional({
    enum: [
      'pending',
      'approved',
      'rejected',
      'expired',
      'cancelled',
      'auto_approved',
    ],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: ['read', 'write', 'high_risk'] })
  @IsOptional()
  @IsString()
  riskLevel?: string;

  @ApiPropertyOptional({
    enum: [
      'tool_call',
      'git_write',
      'terminal_exec',
      'external_sync',
      'status_change',
    ],
  })
  @IsOptional()
  @IsString()
  actionType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  offset?: number;
}
