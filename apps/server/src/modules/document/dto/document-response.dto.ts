import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentSectionResponseDto } from './section-response.dto';
import { DocumentFolderResponseDto } from './folder-response.dto';

/**
 * Document 响应契约（裸数据口径，不含 TransformInterceptor 信封）。
 */

/** 项目摘要（document.project） */
export class DocumentProjectSummaryDto {
  @ApiProperty({ type: String, description: '项目 ID' })
  id: string;

  @ApiProperty({ type: String, description: '项目名' })
  name: string;

  @ApiPropertyOptional({
    type: String,
    description: '项目颜色（仅 findOne 返回）',
    nullable: true,
  })
  color?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '项目代码（apm:// 命名空间，仅 findOne 返回）',
    nullable: true,
  })
  projectCode?: string | null;
}

/** 关联计数（_count） */
export class DocumentCountDto {
  @ApiPropertyOptional({ type: Number, description: '章节数（仅列表返回）' })
  sections?: number;

  @ApiProperty({ type: Number, description: '版本数' })
  versions: number;

  @ApiProperty({ type: Number, description: '任务关联数' })
  links: number;
}

/** Document 标量字段 */
export class DocumentBaseDto {
  @ApiProperty({ type: String, description: '文档 ID' })
  id: string;

  @ApiProperty({ type: String, description: '标题' })
  title: string;

  @ApiProperty({ type: String, description: '正文（markdown）' })
  content: string;

  @ApiPropertyOptional({ type: String, description: '摘要', nullable: true })
  summary?: string | null;

  @ApiProperty({
    type: String,
    enum: ['requirement', 'design', 'api', 'testing', 'guide', 'custom'],
    description: '文档分类',
  })
  category: string;

  @ApiProperty({
    type: String,
    enum: ['draft', 'reviewing', 'published', 'rejected'],
    description: '文档状态',
  })
  status: string;

  @ApiPropertyOptional({
    type: String,
    description: '文件夹 ID',
    nullable: true,
  })
  folderId?: string | null;

  @ApiPropertyOptional({ type: String, description: '项目 ID', nullable: true })
  projectId?: string | null;

  @ApiProperty({ type: String, description: '作者 User ID' })
  authorId: string;

  @ApiProperty({ type: Number, description: '字数' })
  wordCount: number;

  @ApiProperty({ type: Boolean, description: '软删标记' })
  isDeleted: boolean;

  @ApiPropertyOptional({
    description: '删除时间（ISO）',
    type: String,
    nullable: true,
  })
  deletedAt?: string | null;

  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;

  @ApiPropertyOptional({
    description: '发布时间（ISO）',
    type: String,
    nullable: true,
  })
  publishedAt?: string | null;

  @ApiPropertyOptional({
    type: String,
    enum: ['charter', 'spec', 'design', 'decision', 'release-log', 'reference'],
    description: '治理角色（契约与文档知识层 v2 纪要 §10；null=未治理）',
    nullable: true,
  })
  docRole?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'apm:// 稳定短号（D{seq}，DocRegistry 回填）',
    nullable: true,
  })
  shortId?: string | null;
}

/** 文档（create/update/restore 返回：folder + project 摘要） */
export class DocumentResponseDto extends DocumentBaseDto {
  @ApiPropertyOptional({
    type: DocumentFolderResponseDto,
    description: '所属文件夹（列表场景仅含 id/name）',
    nullable: true,
  })
  folder?: DocumentFolderResponseDto | null;

  @ApiPropertyOptional({
    type: DocumentProjectSummaryDto,
    description: '所属项目摘要',
  })
  project?: DocumentProjectSummaryDto;
}

/** 文档列表项（findAll：folder/project 摘要 + _count） */
export class DocumentListItemDto extends DocumentBaseDto {
  @ApiPropertyOptional({
    type: DocumentFolderResponseDto,
    description: '所属文件夹摘要（仅 id/name）',
  })
  folder?: Pick<DocumentFolderResponseDto, 'id' | 'name'> | null;

  @ApiPropertyOptional({
    type: DocumentProjectSummaryDto,
    description: '所属项目摘要（仅 id/name）',
  })
  project?: Pick<DocumentProjectSummaryDto, 'id' | 'name'>;

  @ApiProperty({ type: DocumentCountDto, description: '章节/版本/关联计数' })
  _count: DocumentCountDto;
}

/** 文档分页 meta（{ page, pageSize, total, totalPages }） */
export class DocumentPageMetaDto {
  @ApiProperty({ type: Number, description: '当前页码（从 1 起）' })
  page: number;

  @ApiProperty({ type: Number, description: '每页条数' })
  pageSize: number;

  @ApiProperty({ type: Number, description: '总条数' })
  total: number;

  @ApiProperty({ type: Number, description: '总页数' })
  totalPages: number;
}

/** 文档分页列表（findAll：{ data, meta }） */
export class DocumentPageResponseDto {
  @ApiProperty({ type: [DocumentListItemDto], description: '当前页文档' })
  data: DocumentListItemDto[];

  @ApiProperty({ type: DocumentPageMetaDto, description: '分页信息' })
  meta: DocumentPageMetaDto;
}

/** 最近更新文档摘要（stats.recent 元素） */
export class DocumentRecentItemDto {
  @ApiProperty({ type: String, description: '文档 ID' })
  id: string;

  @ApiProperty({ type: String, description: '标题' })
  title: string;

  @ApiProperty({
    type: String,
    enum: ['draft', 'reviewing', 'published', 'rejected'],
    description: '文档状态',
  })
  status: string;

  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;
}

/** 文档统计（getStats） */
export class DocumentStatsResponseDto {
  @ApiProperty({ type: Number, description: '文档总数' })
  total: number;

  @ApiProperty({
    description: '按状态计数（key=status，value=数量）',
    type: Object,
    additionalProperties: { type: 'number' },
  })
  byStatus: Record<string, number>;

  @ApiProperty({
    description: '按分类计数（key=category，value=数量）',
    type: Object,
    additionalProperties: { type: 'number' },
  })
  byCategory: Record<string, number>;

  @ApiProperty({ type: [DocumentRecentItemDto], description: '最近更新 5 篇' })
  recent: DocumentRecentItemDto[];
}

/** 文档详情（findOne：folder 完整 + project{id,name,color} + sections + _count） */
export class DocumentDetailResponseDto extends DocumentBaseDto {
  @ApiPropertyOptional({
    type: DocumentFolderResponseDto,
    description: '所属文件夹（完整字段）',
    nullable: true,
  })
  folder?: DocumentFolderResponseDto | null;

  @ApiPropertyOptional({
    type: DocumentProjectSummaryDto,
    description: '所属项目（含 color）',
  })
  project?: DocumentProjectSummaryDto;

  @ApiProperty({
    type: [DocumentSectionResponseDto],
    description: '章节列表（按 order 升序）',
  })
  sections: DocumentSectionResponseDto[];

  @ApiProperty({ type: DocumentCountDto, description: '版本/关联计数' })
  _count: DocumentCountDto;
}
