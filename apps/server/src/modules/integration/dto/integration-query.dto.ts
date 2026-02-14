import { IsOptional, IsString } from 'class-validator';

export class IntegrationQueryDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  projectId?: string;
}
