import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RunWorkflowDto {
  @ApiProperty({
    description: 'Project ID for workflow context',
    example: 'project-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    description: 'Task ID for workflow context',
    example: 'task-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiProperty({
    description: 'Workflow parameters',
    example: { key: 'value' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @ApiProperty({
    description: 'Workflow trigger type',
    example: 'manual',
    required: false,
  })
  @IsOptional()
  @IsString()
  triggerType?: string;
}
