import { IsOptional, IsString, IsDateString } from 'class-validator';

export class ConversationQueryDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}
