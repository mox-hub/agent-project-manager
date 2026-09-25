import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class AssignIssueAgentDto {
  @ApiProperty({
    description:
      'AI 成员 ID（Member.id，type=ai_agent）。字段名与创建/更新 DTO 的 aiAgentId 对齐；' +
      '两者同传时以 aiAgentId 为准，均缺省时 400',
    example: 'clx...',
  })
  @IsOptional()
  @IsString()
  aiAgentId?: string;

  @ApiProperty({
    description:
      '[deprecated] 旧字段名，等价于 aiAgentId，仅为兼容既有调用方保留',
    example: 'clx...',
    required: false,
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  agentId?: string;

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
