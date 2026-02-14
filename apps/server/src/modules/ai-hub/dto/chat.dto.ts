import { IsString, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessageDto {
  @IsString()
  role: 'user' | 'assistant' | 'system';

  @IsString()
  content: string;
}

export class ContextHintsDto {
  @IsOptional()
  includeGitDiff?: boolean;

  @IsOptional()
  includeRecentActivities?: boolean;

  @IsOptional()
  includeProjectSummary?: boolean;

  @IsOptional()
  includeTaskDetails?: boolean;
}

export class ChatRequestDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @ValidateNested()
  @Type(() => ChatMessageDto)
  message: ChatMessageDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContextHintsDto)
  contextHints?: ContextHintsDto;

  @IsOptional()
  @IsString()
  modelPreference?: string;
}
