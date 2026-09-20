// Document Tag 响应 DTO（口径：JSON 序列化后的 Prisma Tag 裸数据）
import { ApiProperty } from '@nestjs/swagger';

export class DocumentTagDto {
  @ApiProperty({ description: '标签 ID' })
  id: string;

  @ApiProperty({
    description: '所属项目 ID（全局标签为 null）',
    nullable: true,
    type: String,
  })
  projectId: string | null;

  @ApiProperty({ description: '标签名' })
  name: string;

  @ApiProperty({ description: '颜色', nullable: true, type: String })
  color: string | null;

  @ApiProperty({ description: '描述', nullable: true, type: String })
  description: string | null;

  @ApiProperty({
    description: '标签归属功能域：project | task | bug | document',
    example: 'document',
  })
  resourceType: string;

  @ApiProperty({ description: '创建时间（ISO 8601）' })
  createdAt: string;

  @ApiProperty({ description: '创建人 ID', nullable: true, type: String })
  createdBy: string | null;

  @ApiProperty({
    description: '扩展元数据',
    nullable: true,
    type: 'object',
    additionalProperties: true,
  })
  metadata?: unknown;
}

/** GET /documents/tags —— 控制器包裹 { data: Tag[] } */
export class DocumentTagListResponseDto {
  @ApiProperty({ description: '标签列表', type: [DocumentTagDto] })
  data: DocumentTagDto[];
}

/** POST /documents/tags、PUT /documents/tags/:id —— 包裹 { data: Tag } */
export class DocumentTagResponseDto {
  @ApiProperty({ description: '标签', type: DocumentTagDto })
  data: DocumentTagDto;
}

/** DELETE /documents/tags/:id —— 包裹 { data: { id } } */
export class DocumentTagDeleteResponseDto {
  @ApiProperty({
    description: '被删除标签的 ID',
    type: 'object',
    properties: { id: { type: 'string' } },
  })
  data: { id: string };
}
