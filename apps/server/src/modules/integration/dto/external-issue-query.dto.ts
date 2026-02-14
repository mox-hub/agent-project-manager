import { IsOptional, IsString } from 'class-validator';

export class ExternalIssueQueryDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  externalId?: string;
}
