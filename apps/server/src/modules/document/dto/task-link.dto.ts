// Document Task Link DTOs
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskLinkDto {
  @ApiPropertyOptional({ description: '文档 ID' })
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiPropertyOptional({ description: '章节 ID' })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiProperty({ description: '关联任务 ID' })
  @IsString()
  issueId: string;

  @ApiProperty({ description: '所属项目 ID' })
  @IsString()
  projectId: string;

  @ApiPropertyOptional({
    description: '链接类型',
    enum: ['references', 'blocks', 'relates', 'implements'],
  })
  @IsOptional()
  @IsEnum(['references', 'blocks', 'relates', 'implements'])
  linkType?: 'references' | 'blocks' | 'relates' | 'implements';

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateLinkTypeDto {
  @ApiProperty({
    description: '链接类型',
    enum: ['references', 'blocks', 'relates', 'implements'],
  })
  @IsEnum(['references', 'blocks', 'relates', 'implements'])
  linkType: 'references' | 'blocks' | 'relates' | 'implements';
}

export class BatchCreateLinksDto {
  @ApiProperty({ description: '链接列表', type: [CreateTaskLinkDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskLinkDto)
  links: CreateTaskLinkDto[];
}

// ========== 响应 DTO（口径：JSON 序列化后的 Prisma DocumentTaskLink 裸数据） ==========

export class DocumentTaskLinkDto {
  @ApiProperty({ description: '关联 ID' })
  id: string;

  @ApiProperty({
    description: '文档 ID（章节级关联为 null）',
    nullable: true,
    type: String,
  })
  documentId: string | null;

  @ApiProperty({
    description: '章节 ID（文档级关联为 null）',
    nullable: true,
    type: String,
  })
  sectionId: string | null;

  @ApiProperty({ description: '关联任务 ID' })
  issueId: string;

  @ApiProperty({ description: '所属项目 ID' })
  projectId: string;

  @ApiProperty({
    description: '链接类型',
    enum: ['references', 'blocks', 'relates', 'implements'],
  })
  linkType: string;

  @ApiProperty({ description: '备注', nullable: true, type: String })
  note: string | null;

  @ApiProperty({ description: '创建人 ID' })
  createdBy: string;

  @ApiProperty({ description: '创建时间（ISO 8601）' })
  createdAt: string;

  @ApiProperty({ description: '更新时间（ISO 8601）' })
  updatedAt: string;
}

export class DocumentTaskLinkStatsDto {
  @ApiProperty({ description: '关联总数' })
  totalLinks: number;

  @ApiProperty({
    description: '按链接类型计数',
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  byType: Record<string, number>;

  @ApiProperty({
    description: '按项目计数',
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  byProject: Record<string, number>;
}

/** by-section 聚合中的章节摘要（来自 DocumentSection 的 select 投影） */
export class DocumentLinkSectionInfoDto {
  @ApiProperty({ description: '章节 ID' })
  id: string;

  @ApiProperty({ description: '章节标题' })
  title: string;

  @ApiProperty({ description: '锚点', nullable: true, type: String })
  anchor: string | null;

  @ApiProperty({ description: '排序序号' })
  order: number;

  @ApiProperty({ description: '标题层级' })
  level: number;
}

/** GET /documents/:documentId/links/by-section 的聚合项 */
export class DocumentLinkSectionGroupDto {
  @ApiProperty({ description: '章节 ID' })
  sectionId: string;

  @ApiProperty({ description: '章节摘要', type: DocumentLinkSectionInfoDto })
  section: DocumentLinkSectionInfoDto;

  @ApiProperty({
    description: '该章节下的关联列表（无关联为空数组）',
    type: [DocumentTaskLinkDto],
  })
  links: DocumentTaskLinkDto[];
}

/** POST /documents/:documentId/links/batch —— Prisma createMany 返回值 */
export class BatchCreateLinksResponseDto {
  @ApiProperty({ description: '成功创建的关联数量' })
  count: number;
}
