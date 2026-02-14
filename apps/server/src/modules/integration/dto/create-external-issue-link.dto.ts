import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExternalIssueLinkDto {
  @ApiProperty({
    description: 'Project ID',
    example: 'project-123',
  })
  @IsString()
  projectId: string;

  @ApiProperty({
    description: 'Task ID (optional)',
    example: 'task-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiProperty({
    description: 'External provider name',
    example: 'github',
  })
  @IsString()
  provider: string;

  @ApiProperty({
    description: 'External issue ID',
    example: '123',
  })
  @IsString()
  externalId: string;

  @ApiProperty({
    description: 'External issue URL',
    example: 'https://github.com/owner/repo/issues/123',
  })
  @IsString()
  url: string;

  @ApiProperty({
    description: 'Issue summary',
    example: 'Fix authentication bug',
    required: false,
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({
    description: 'Issue status',
    example: 'open',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Additional metadata',
    example: { key: 'value' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
