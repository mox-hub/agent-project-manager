import { IsString, IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TaskQueryDto {
  @ApiProperty({
    description:
      'JSON string for filters, e.g. {"status":["todo"],"assigneeId":["user-1"],"iterationId":["iter-1"],"tag":["tag-1"]}',
    example: '{"status":["todo"],"assigneeId":["user-1"]}',
    required: false,
  })
  @IsString()
  @IsOptional()
  filters?: string;

  @ApiProperty({
    description: 'Search query',
    example: 'authentication',
    required: false,
  })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiProperty({
    description: 'Task type filter: task or bug',
    enum: ['task', 'bug'],
    required: false,
  })
  @IsEnum(['task', 'bug'])
  @IsOptional()
  type?: string;

  @ApiProperty({
    description: 'Bug severity filter',
    enum: ['critical', 'high', 'medium', 'low'],
    required: false,
  })
  @IsEnum(['critical', 'high', 'medium', 'low'])
  @IsOptional()
  severity?: string;

  @ApiProperty({
    description: 'Parent task ID filter - returns subtasks of specified parent',
    example: 'cmsxxx',
    required: false,
  })
  @IsString()
  @IsOptional()
  parentTaskId?: string;

  @ApiProperty({
    description: 'Page number',
    example: 1,
    default: 1,
    required: false,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Page size',
    example: 20,
    default: 20,
    required: false,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number = 20;
}
