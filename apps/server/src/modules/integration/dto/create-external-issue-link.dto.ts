import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateExternalIssueLinkDto {
  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsString()
  provider: string;

  @IsString()
  externalId: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
