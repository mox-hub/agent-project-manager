import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class AssignIssueAgentDto {
  @ApiProperty({
    description: 'AI 成员 ID（Member.id，type=ai_agent）',
    example: 'clx...',
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
}
