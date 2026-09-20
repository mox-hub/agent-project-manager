import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIssueDependencyDto {
  @ApiProperty({
    description: 'Task ID that this task depends on',
    example: 'task-123',
  })
  @IsString()
  dependsOnIssueId: string;

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
