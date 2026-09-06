import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AssistantConversationQueryDto {
  @ApiProperty({
    description: 'Project scope; omit for workspace-level session',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    description:
      'Explicit conversation id (switch history); omit to follow current',
    required: false,
  })
  @IsOptional()
  @IsString()
  conversationId?: string;
}

export class AssistantCreateConversationDto {
  @ApiProperty({
    description: 'Project scope; omit for workspace-level session',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;
}

/** 随消息附带的「正在查看」上下文（前端自动感知，可被用户移除） */
export class AssistantViewingDto {
  @ApiProperty({
    description: 'Entity type currently viewed on the left side',
    enum: ['task', 'bug', 'document', 'repository', 'member', 'project'],
  })
  @IsIn(['task', 'bug', 'document', 'repository', 'member', 'project'])
  type: 'task' | 'bug' | 'document' | 'repository' | 'member' | 'project';

  @ApiProperty({ description: 'Entity id' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Display title (best effort)', required: false })
  @IsOptional()
  @IsString()
  title?: string;
}

export class AssistantSendMessageDto {
  @ApiProperty({ description: 'User message content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'Project scope; omit for workspace-level session',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    description: 'Target conversation; omit to use current',
    required: false,
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiProperty({
    description:
      'Model choice: cli | cli:<providerId> | llm:<provider> | <model name>; omit to reuse conversation memory',
    required: false,
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({
    description: 'Currently-viewed entity to inject as context',
    required: false,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AssistantViewingDto)
  viewing?: AssistantViewingDto;
}

export class AssistantDispatchDto {
  @ApiProperty({ description: 'Instruction to execute on the CLI runtime' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Project scope (required for execution)' })
  @IsString()
  @IsNotEmpty()
  projectId: string;
}

export class AssistantSilentDto {
  @ApiProperty({
    description:
      'Silent scenario name registered on the server (quick-prompts | create-suggestions | project-score | anchor-qa)',
  })
  @IsString()
  @IsNotEmpty()
  scenario: string;

  @ApiProperty({
    description: 'Project scope for the request',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    description: 'Free-form page context passed to the scenario builder',
    required: false,
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
