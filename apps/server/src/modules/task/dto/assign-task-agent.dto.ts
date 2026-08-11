import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class AssignTaskAgentDto {
  @ApiProperty({
    description: 'Agent identity ID',
    example: 'agent_123',
  })
  @IsString()
  agentId: string;

  @ApiProperty({
    description: 'Assignee type',
    enum: ['ai_agent'],
    example: 'ai_agent',
    required: false,
  })
  @IsIn(['ai_agent'])
  @IsOptional()
  assigneeType?: 'ai_agent';

  @ApiProperty({
    description: 'Task execution specification for the assigned agent',
    example: {
      expectedOutput: '输出结构化执行计划',
      tools: ['task.read', 'task.write'],
      confirmationRequired: true,
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  aiExecutionSpec?: Record<string, unknown>;
}
