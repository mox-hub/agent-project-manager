/**
 * 文档本地存储 / 异步同步响应 DTO
 */
import { ApiProperty } from '@nestjs/swagger';

export class StorageConfigResponseDto {
  @ApiProperty({ type: String })
  basePath: string;

  @ApiProperty({ type: Boolean })
  autoSync: boolean;

  @ApiProperty({ type: Boolean })
  syncOnUpdate: boolean;

  @ApiProperty({ type: String, enum: ['md', 'mdx'] })
  fileExtension: string;

  @ApiProperty({ type: String })
  defaultSubfolder: string;

  @ApiProperty({ type: Boolean })
  forceFileSync: boolean;
}

export class StoredFileMetaResponseDto {
  @ApiProperty({ type: String })
  documentId: string;

  @ApiProperty({ type: String })
  fileName: string;

  @ApiProperty({ type: String })
  fullPath: string;

  @ApiProperty({ type: Number })
  size: number;

  @ApiProperty({ type: String, format: 'date-time' })
  modifiedAt: string;
}

export class SyncWarningResponseDto {
  @ApiProperty({ type: String })
  documentId: string;

  @ApiProperty({ type: String })
  lastError: string;

  @ApiProperty({ type: Number })
  attempts: number;

  @ApiProperty({ type: String, format: 'date-time' })
  firstFailedAt: string;

  @ApiProperty({ type: String, format: 'date-time' })
  lastAttemptAt: string;

  @ApiProperty({ type: String })
  resolvedPath?: string;
}

export class DefaultPathResponseDto {
  @ApiProperty({ type: String })
  path: string;
}

export class DocumentContentResponseDto {
  @ApiProperty({ type: String })
  content: string;
}

export class ClearedResponseDto {
  @ApiProperty({ type: Boolean })
  cleared: boolean;
}

export class DeletedResponseDto {
  @ApiProperty({ type: Boolean })
  deleted: boolean;
}
