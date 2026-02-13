import { IsString, IsOptional, IsInt, Min, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class TaskQueryDto {
  @IsString()
  @IsOptional()
  status?: string | string[];

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsString()
  @IsOptional()
  iterationId?: string;

  @IsString()
  @IsOptional()
  parentTaskId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tag?: string | string[];

  @IsString()
  @IsOptional()
  q?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number = 20;
}
