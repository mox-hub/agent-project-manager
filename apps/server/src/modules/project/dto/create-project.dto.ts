import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsInt,
  IsHexColor,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({
    description: 'Project name',
    example: 'My Project',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Project description',
    example: 'A description of the project',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Project type',
    enum: ['personal', 'team', 'experiment', 'enterprise'],
    example: 'team',
  })
  @IsEnum(['personal', 'team', 'experiment', 'enterprise'])
  type: string;

  @ApiProperty({
    description: 'Project visibility',
    enum: ['private', 'internal', 'public'],
    example: 'private',
  })
  @IsEnum(['private', 'internal', 'public'])
  visibility: string;

  @ApiProperty({
    description: 'Project configuration',
    example: { key: 'value' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiProperty({
    description: 'Project template ID',
    example: 'template-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  templateId?: string;

  @ApiProperty({ required: false, example: 'APM-123' })
  @IsString()
  @IsOptional()
  projectCode?: string;

  @ApiProperty({ required: false, example: 'rocket' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ required: false, example: '#5E6AD2' })
  @IsHexColor()
  @IsOptional()
  color?: string;

  @ApiProperty({
    required: false,
    enum: ['low', 'medium', 'high', 'urgent'],
    example: 'medium',
  })
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  priority?: string;

  @ApiProperty({
    required: false,
    enum: ['backlog', 'planned', 'in_progress', 'completed', 'canceled'],
    example: 'planned',
  })
  @IsEnum(['backlog', 'planned', 'in_progress', 'completed', 'canceled'])
  @IsOptional()
  workflowStatus?: string;

  @ApiProperty({
    required: false,
    enum: ['on_track', 'at_risk', 'off_track'],
    example: 'at_risk',
  })
  @IsEnum(['on_track', 'at_risk', 'off_track'])
  @IsOptional()
  healthStatus?: string;

  @ApiProperty({
    required: false,
    enum: ['low', 'medium', 'high', 'critical'],
    example: 'medium',
  })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  riskLevel?: string;

  @ApiProperty({ required: false, minimum: 0, maximum: 100, example: 35 })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number;

  @ApiProperty({ required: false, example: 'user-123' })
  @IsString()
  @IsOptional()
  ownerId?: string;

  @ApiProperty({ required: false, example: '2026-03-01T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false, example: '2026-06-30T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  targetDate?: string;

  @ApiProperty({ required: false, example: 'platform' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false, example: 40 })
  @IsInt()
  @Min(0)
  @IsOptional()
  estimatePoints?: number;

  @ApiProperty({ required: false, example: 'Blocked by dependency migration' })
  @IsString()
  @IsOptional()
  blockedReason?: string;
}
