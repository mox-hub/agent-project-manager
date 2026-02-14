import { IsString, IsOptional, IsInt, Min, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TaskQueryDto {
  @ApiProperty({
    description: 'Task status filter (can be array)',
    example: 'in-progress',
    required: false,
  })
  @IsString()
  @IsOptional()
  status?: string | string[];

  @ApiProperty({
    description: 'Filter by assignee ID',
    example: 'user-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  assigneeId?: string;

  @ApiProperty({
    description: 'Filter by iteration ID',
    example: 'iteration-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  iterationId?: string;

  @ApiProperty({
    description: 'Filter by parent task ID',
    example: 'task-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  parentTaskId?: string;

  @ApiProperty({
    description: 'Filter by tags (can be array)',
    example: 'frontend',
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tag?: string | string[];

  @ApiProperty({
    description: 'Search query',
    example: 'authentication',
    required: false,
  })
  @IsString()
  @IsOptional()
  q?: string;

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
