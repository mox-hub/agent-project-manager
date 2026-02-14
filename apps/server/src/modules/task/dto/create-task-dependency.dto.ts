import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskDependencyDto {
  @ApiProperty({
    description: 'Task ID that this task depends on',
    example: 'task-123',
  })
  @IsString()
  dependsOnTaskId: string;

  @ApiProperty({
    description: 'Dependency type',
    enum: ['blocks', 'relates'],
    example: 'blocks',
    required: false,
  })
  @IsIn(['blocks', 'relates'])
  @IsOptional()
  type?: 'blocks' | 'relates';
}
