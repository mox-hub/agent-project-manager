import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExternalIssueQueryDto {
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
    description: 'Filter by provider',
    example: 'github',
    required: false,
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({
    description: 'Filter by external issue ID',
    example: '123',
    required: false,
  })
  @IsOptional()
  @IsString()
  externalId?: string;
}
