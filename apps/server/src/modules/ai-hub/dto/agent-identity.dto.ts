import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateAgentIdentityDto {
  @ApiProperty({
    description:
      'Project scope for this agent. Omit for a global temporary agent.',
    example: 'project_123',
    required: false,
  })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiProperty({
    description: 'Agent display name',
    example: '研发执行代理',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Agent identity type',
    enum: ['ai_employee', 'temp_agent'],
    example: 'ai_employee',
    required: false,
  })
  @IsIn(['ai_employee', 'temp_agent'])
  @IsOptional()
  type?: string;

  @ApiProperty({
    description: 'Agent description',
    example: '负责领取研发任务并生成执行计划',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'System prompt for the agent',
    example: '你是项目中的 AI 员工，先读取任务上下文，再提出可执行计划。',
    required: false,
  })
  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @ApiProperty({
    description: 'Tool policy / allowed capability set',
    example: {
      tools: ['task.read', 'task.write', 'project.read'],
      requiresApproval: ['task.write'],
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  toolPolicy?: Record<string, unknown>;

  @ApiProperty({
    description: 'Additional metadata',
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
