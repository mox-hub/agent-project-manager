import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['personal', 'team', 'experiment', 'enterprise'])
  type: string;

  @IsEnum(['private', 'internal', 'public'])
  visibility: string;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @IsString()
  @IsOptional()
  templateId?: string;
}
