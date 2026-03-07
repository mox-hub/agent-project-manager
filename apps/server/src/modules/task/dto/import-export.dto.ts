import { IsString, IsOptional, IsEnum, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ImportTaskDto {
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

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsString()
  @IsOptional()
  reporterId?: string;

  @IsString()
  @IsOptional()
  iterationId?: string;

  @IsString()
  @IsOptional()
  dueDate?: string;

  @IsNumber()
  @IsOptional()
  estimate?: number;
}

export class ImportTasksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportTaskDto)
  tasks: ImportTaskDto[];
}

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
}
