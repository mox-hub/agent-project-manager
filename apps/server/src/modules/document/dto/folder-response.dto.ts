import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Document Folder 响应契约（裸数据口径）。
 */

/** 文件夹计数（_count） */
export class DocumentFolderCountDto {
  @ApiProperty({ type: Number, description: '文件夹内文档数（含已删除）' })
  documents: number;

  @ApiProperty({ type: Number, description: '子文件夹数' })
  children: number;
}

/** 文档文件夹（DocumentFolder 裸字段） */
export class DocumentFolderResponseDto {
  @ApiProperty({ type: String, description: '文件夹 ID' })
  id: string;

  @ApiProperty({ type: String, description: '文件夹名' })
  name: string;

  @ApiPropertyOptional({
    type: String,
    description: '父文件夹 ID',
    nullable: true,
  })
  parentId?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '项目 ID（未绑定为 null）',
    nullable: true,
  })
  projectId?: string | null;

  @ApiProperty({ type: Number, description: '排序序号' })
  order: number;

  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;
}

/** 文件夹列表项（含 _count） */
export class DocumentFolderListItemDto extends DocumentFolderResponseDto {
  @ApiProperty({
    type: DocumentFolderCountDto,
    description: '文档/子文件夹计数',
  })
  _count: DocumentFolderCountDto;
}

/** 文件夹树节点（children 递归嵌套） */
export class DocumentFolderTreeNodeDto extends DocumentFolderListItemDto {
  @ApiProperty({
    type: () => [DocumentFolderTreeNodeDto],
    description: '子文件夹（按 parentId 嵌套，叶子为空数组）',
  })
  children: DocumentFolderTreeNodeDto[];
}

/** 文件夹内文档摘要（findOne 返回） */
export class DocumentFolderDocSummaryDto {
  @ApiProperty({ type: String, description: '文档 ID' })
  id: string;

  @ApiProperty({ type: String, description: '标题' })
  title: string;

  @ApiProperty({ type: String, description: '分类' })
  category: string;

  @ApiProperty({ type: String, description: '状态' })
  status: string;

  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;
}

/** 文件夹详情（findOne：parent + children + documents + _count） */
export class DocumentFolderDetailResponseDto extends DocumentFolderResponseDto {
  @ApiPropertyOptional({
    type: DocumentFolderResponseDto,
    description: '父文件夹',
    nullable: true,
  })
  parent?: DocumentFolderResponseDto | null;

  @ApiProperty({
    type: [DocumentFolderListItemDto],
    description: '子文件夹（含 _count，按 order 升序）',
  })
  children: DocumentFolderListItemDto[];

  @ApiProperty({
    type: [DocumentFolderDocSummaryDto],
    description: '文件夹内文档摘要（不含已删除，按更新时间倒序）',
  })
  documents: DocumentFolderDocSummaryDto[];

  @ApiProperty({
    type: DocumentFolderCountDto,
    description: '文档/子文件夹计数',
  })
  _count: DocumentFolderCountDto;
}
