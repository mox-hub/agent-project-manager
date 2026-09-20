/**
 * 文档引用查询/统计响应 DTO
 */
import { ApiProperty } from '@nestjs/swagger';

export class DocumentReferenceResponseDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  sourceType: string;

  @ApiProperty({ type: String })
  sourceId: string;

  @ApiProperty({ type: String })
  documentId: string;

  @ApiProperty({ type: String, nullable: true })
  sectionId: string | null;

  @ApiProperty({ type: String, nullable: true })
  anchor: string | null;

  @ApiProperty({ type: String, nullable: true })
  context: string | null;

  @ApiProperty({ type: String })
  createdBy: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;
}

export class ReferenceStatsResponseDto {
  @ApiProperty({ type: Number })
  totalReferences: number;

  @ApiProperty({
    type: Object,
    additionalProperties: { type: 'number' },
    description: '按来源类型分组的引用计数',
  })
  bySourceType: Record<string, number>;
}

export class ParsedReferenceResponseDto {
  @ApiProperty({ type: String })
  documentId: string;

  @ApiProperty({ type: String })
  sectionId?: string;

  @ApiProperty({ type: String })
  anchor?: string;
}

export class GeneratedReferenceResponseDto {
  @ApiProperty({ type: String })
  reference: string;
}
