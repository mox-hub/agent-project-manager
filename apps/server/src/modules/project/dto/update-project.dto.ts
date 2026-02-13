import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['personal', 'team', 'experiment', 'enterprise'])
  @IsOptional()
  type?: string;

  @IsEnum(['private', 'internal', 'public'])
  @IsOptional()
  visibility?: string;

  @IsEnum(['active', 'archived'])
  @IsOptional()
  status?: string;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}
