import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 审批关联文档投影：列表/待审批只带 id/title/authorId/status，
 * 详情（GET approvals/:id）额外带 content。
 */
export class ApprovalDocumentSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({
    description: '文档正文（仅审批详情返回）',
    type: String,
    nullable: true,
  })
  content?: string | null;

  @ApiProperty({ description: '文档作者用户 ID' })
  authorId: string;

  @ApiProperty({ description: '文档状态（draft / reviewing / published …）' })
  status: string;
}

/** Prisma DocumentApproval（JSON 序列化形态；document 仅列表/待审批/详情返回） */
export class ApprovalResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  documentId: string;

  @ApiProperty({
    description: '审批状态',
    enum: ['pending', 'approved', 'rejected'],
  })
  status: string;

  @ApiProperty({ description: '提交人用户 ID' })
  submitterId: string;

  @ApiPropertyOptional({
    description: '审批人用户 ID（未审批为 null）',
    type: String,
    nullable: true,
  })
  approverId: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  comment: string | null;

  @ApiPropertyOptional({
    description: '审批时文档版本号',
    type: String,
    nullable: true,
  })
  version: string | null;

  @ApiProperty({ description: '创建时间（ISO）' })
  createdAt: string;

  @ApiPropertyOptional({
    description: '解决时间（ISO，未解决为 null）',
    type: String,
    nullable: true,
  })
  resolvedAt: string | null;

  @ApiPropertyOptional({
    type: ApprovalDocumentSummaryDto,
    description: '关联文档投影（提交/解决操作不返回）',
  })
  document?: ApprovalDocumentSummaryDto;
}
