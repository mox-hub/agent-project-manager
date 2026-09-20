import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Document Section 响应契约（裸数据口径）。
 */

/** 文档章节（DocumentSection） */
export class DocumentSectionResponseDto {
  @ApiProperty({ type: String, description: '章节 ID' })
  id: string;

  @ApiProperty({ type: String, description: '文档 ID' })
  documentId: string;

  @ApiProperty({ type: String, description: '章节标题' })
  title: string;

  @ApiProperty({ type: Number, description: '标题级别 1-6（对应 h1-h6）' })
  level: number;

  @ApiProperty({ type: String, description: '锚点标识' })
  anchor: string;

  @ApiPropertyOptional({
    type: String,
    description: '章节内容（markdown）',
    nullable: true,
  })
  content?: string | null;

  @ApiProperty({ type: Number, description: '排序序号' })
  order: number;

  @ApiPropertyOptional({
    type: String,
    description: '父章节 ID',
    nullable: true,
  })
  parentId?: string | null;

  @ApiProperty({ type: Number, description: '字数' })
  wordCount: number;

  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;
}

/** 章节树节点（含 children 嵌套） */
export class DocumentSectionTreeNodeDto extends DocumentSectionResponseDto {
  @ApiProperty({
    type: () => [DocumentSectionTreeNodeDto],
    description: '子章节（按 parentId 嵌套）',
  })
  children: DocumentSectionTreeNodeDto[];
}

/** 章节索引刷新结果（refreshSections，Prisma createMany BatchPayload） */
export class SectionRefreshResponseDto {
  @ApiProperty({ type: Number, description: '重建的章节数量' })
  count: number;
}
