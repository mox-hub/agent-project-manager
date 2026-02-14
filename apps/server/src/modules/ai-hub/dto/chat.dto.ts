import { IsString, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({
    description: 'Message role',
    enum: ['user', 'assistant', 'system'],
    example: 'user',
  })
  @IsString()
  role: 'user' | 'assistant' | 'system';

  @ApiProperty({
    description: 'Message content',
    example: 'What is the status of the authentication feature?',
  })
  @IsString()
  content: string;
}

export class ContextHintsDto {
  @ApiProperty({
    description: 'Include Git diff in context',
    example: true,
    required: false,
  })
  @IsOptional()
  includeGitDiff?: boolean;

  @ApiProperty({
    description: 'Include recent activities in context',
    example: true,
    required: false,
  })
  @IsOptional()
  includeRecentActivities?: boolean;

  @ApiProperty({
    description: 'Include project summary in context',
    example: true,
    required: false,
  })
  @IsOptional()
  includeProjectSummary?: boolean;

  @ApiProperty({
    description: 'Include task details in context',
    example: true,
    required: false,
  })
  @IsOptional()
  includeTaskDetails?: boolean;
}

export class ChatRequestDto {
  @ApiProperty({
    description: 'Project ID for context',
    example: 'project-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    description: 'Task ID for context',
    example: 'task-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiProperty({
    description: 'Conversation ID to continue existing conversation',
    example: 'conversation-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiProperty({
    description: 'Chat message',
    type: ChatMessageDto,
  })
  @ValidateNested()
  @Type(() => ChatMessageDto)
  message: ChatMessageDto;

  @ApiProperty({
    description: 'Context hints for AI',
    type: ContextHintsDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContextHintsDto)
  contextHints?: ContextHintsDto;

  @ApiProperty({
    description: 'Preferred AI model',
    example: 'gpt-4',
    required: false,
  })
  @IsOptional()
  @IsString()
  modelPreference?: string;
}
