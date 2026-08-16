// Document Reference DTOs
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateReferenceDto {
  @IsEnum(['ai_conversation', 'task', 'project'])
  sourceType: 'ai_conversation' | 'task' | 'project';

  @IsString()
  sourceId: string;

  @IsString()
  documentId: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  anchor?: string;

  @IsOptional()
  @IsString()
  context?: string;
}

export class BatchCreateReferencesDto {
  references: CreateReferenceDto[];
}
