import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConversationQueryDto {
  @ApiProperty({
    description: 'Filter by project ID',
    example: 'project-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    description: 'Filter by task ID',
    example: 'task-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiProperty({
    description: 'Search query',
    example: 'authentication',
    required: false,
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({
    description: 'Start date filter (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({
    description: 'End date filter (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
  })
  @IsOptional()
  page?: number;

  @ApiProperty({
    description: 'Page size',
    example: 20,
    required: false,
  })
  @IsOptional()
  pageSize?: number;
}
