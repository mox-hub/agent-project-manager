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

// ========== 响应 DTO（口径：JSON 序列化后的 Prisma DocumentVersion 裸数据） ==========

export class DocumentVersionDto {
  @ApiProperty({ description: '版本 ID' })
  id: string;

  @ApiProperty({ description: '文档 ID' })
  documentId: string;

  @ApiProperty({
    description: '版本号（semver 或自定义标签）',
    example: '1.0.0',
  })
  version: string;

  @ApiProperty({ description: '版本内容（Markdown 全文）' })
  content: string;

  @ApiProperty({
    description: '目录结构 JSON（MarkdownParser 的 tableOfContents 序列化）',
    nullable: true,
    type: String,
  })
  sectionsJson: string | null;

  @ApiProperty({ description: '版本说明', nullable: true, type: String })
  summary: string | null;

  @ApiProperty({ description: '字数统计' })
  wordCount: number;

  @ApiProperty({ description: '创建人 ID' })
  createdBy: string;

  @ApiProperty({ description: '创建时间（ISO 8601）' })
  createdAt: string;
}

export class DocumentVersionStatsDto {
  @ApiProperty({ description: '版本总数' })
  totalVersions: number;

  @ApiProperty({ description: '最新版本号', nullable: true, type: String })
  latestVersion: string | null;

  @ApiProperty({ description: '最早版本号', nullable: true, type: String })
  oldestVersion: string | null;

  @ApiProperty({ description: '最新与最早版本的字数差' })
  wordCountChange: number;
}
