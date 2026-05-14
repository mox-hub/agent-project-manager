// Document Version DTOs
import { IsString, IsOptional } from 'class-validator';

export class CreateVersionDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  summary?: string;
}

export class RollbackVersionDto {
  @IsString()
  versionId: string;
}

export class CompareVersionsDto {
  @IsString()
  versionId1: string;

  @IsString()
  versionId2: string;
}
