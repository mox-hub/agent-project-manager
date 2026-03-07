import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTaskTemplateItemDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsNumber()
  @IsOptional()
  estimate?: number;

  @IsString()
  @IsOptional()
  parentItemId?: string;
}

export class CreateTaskTemplateDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskTemplateItemDto)
  items?: CreateTaskTemplateItemDto[];
}

export class UpdateTaskTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskTemplateItemDto)
  @IsOptional()
  items?: CreateTaskTemplateItemDto[];
}

export class UseTaskTemplateDto {
  @IsString()
  projectId: string;
}
