// Document Task Link DTOs
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateTaskLinkDto {
  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsString()
  taskId: string;

  @IsString()
  projectId: string;

  @IsOptional()
  @IsEnum(['references', 'blocks', 'relates', 'implements'])
  linkType?: 'references' | 'blocks' | 'relates' | 'implements';

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateLinkTypeDto {
  @IsEnum(['references', 'blocks', 'relates', 'implements'])
  linkType: 'references' | 'blocks' | 'relates' | 'implements';
}

export class BatchCreateLinksDto {
  links: CreateTaskLinkDto[];
}
