// Document Section DTOs
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateSectionDto {
  @IsString()
  documentId: string;

  @IsString()
  title: string;

  @IsNumber()
  @Min(1)
  @Max(6)
  level: number;

  @IsString()
  anchor: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateSectionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6)
  level?: number;

  @IsOptional()
  @IsString()
  anchor?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class RefreshSectionsDto {
  @IsString()
  content: string;
}
