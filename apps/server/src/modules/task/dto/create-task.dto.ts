import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({
    description: 'Project ID',
    example: 'project-123',
  })
  @IsString()
  projectId: string;

  @ApiProperty({
    description: 'Task title',
    example: 'Implement user authentication',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Task description',
    example: 'Implement JWT-based authentication system',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Task status',
    example: 'todo',
    required: false,
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({
    description: 'Task priority',
    enum: ['low', 'medium', 'high', 'critical'],
    example: 'high',
    required: false,
  })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  priority?: string;

  @ApiProperty({
    description: 'Assignee user ID',
    example: 'user-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  assigneeId?: string;

  @ApiProperty({
    description: 'Reporter user ID',
    example: 'user-456',
    required: false,
  })
  @IsString()
  @IsOptional()
  reporterId?: string;

  @ApiProperty({
    description: 'Iteration ID',
    example: 'iteration-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  iterationId?: string;

  @ApiProperty({
    description: 'Parent task ID',
    example: 'task-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  parentTaskId?: string;

  @ApiProperty({
    description: 'Start date (ISO 8601)',
    example: '2024-12-01T00:00:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'Due date (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({
    description: 'Estimated hours',
    example: 8,
    required: false,
  })
  @IsInt()
  @IsOptional()
  estimate?: number;

  @ApiProperty({
    description: 'Task tags',
    example: ['frontend', 'urgent'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
