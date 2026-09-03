// Document Version DTOs
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVersionDto {
  @ApiProperty({ description: '版本内容（Markdown）' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: '版本说明' })
  @IsOptional()
  @IsString()
  summary?: string;
}

export class RollbackVersionDto {
  @ApiProperty({ description: '目标版本 ID' })
  @IsString()
  versionId: string;
}

export class CompareVersionsDto {
  @ApiProperty({ description: '对比版本 A 的 ID' })
  @IsString()
  versionId1: string;

  @ApiProperty({ description: '对比版本 B 的 ID' })
  @IsString()
  versionId2: string;
}
