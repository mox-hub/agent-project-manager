import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 列表接口手动关联的 Member 摘要投影 */
export class DocumentMemberSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: '成员类型', enum: ['human', 'ai_agent'] })
  type: string;

  @ApiProperty()
  displayName: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  handle: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  avatarUrl: string | null;
}

/** Prisma DocumentAuthor（member 仅列表返回） */
export class DocumentAuthorResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  documentId: string;

  @ApiProperty()
  memberId: string;

  @ApiProperty({ description: '作者角色', enum: ['author', 'contributor'] })
  role: string;

  @ApiProperty({ description: '创建时间（ISO）' })
  createdAt: string;

  @ApiPropertyOptional({
    type: DocumentMemberSummaryDto,
    description: '成员摘要（仅列表接口返回）',
  })
  member?: DocumentMemberSummaryDto;
}

/** Prisma DocumentReviewer（member 仅列表返回） */
export class DocumentReviewerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  documentId: string;

  @ApiProperty()
  memberId: string;

  @ApiProperty({ description: '审阅角色', default: 'reviewer' })
  role: string;

  @ApiProperty({
    description: '审阅状态',
    enum: ['pending', 'approved', 'rejected'],
  })
  status: string;

  @ApiPropertyOptional({
    description: '审阅时间（ISO，未审阅为 null）',
    type: String,
    nullable: true,
  })
  reviewedAt: string | null;

  @ApiProperty({ description: '创建时间（ISO）' })
  createdAt: string;

  @ApiPropertyOptional({
    type: DocumentMemberSummaryDto,
    description: '成员摘要（仅列表接口返回）',
  })
  member?: DocumentMemberSummaryDto;
}

/** Prisma DocumentTaskLinkAssignee（member 仅列表返回） */
export class DocumentTaskLinkAssigneeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: '文档-任务关联 ID' })
  documentTaskLinkId: string;

  @ApiProperty()
  memberId: string;

  @ApiProperty({ description: '负责人角色', default: 'assignee' })
  role: string;

  @ApiProperty({ description: '创建时间（ISO）' })
  createdAt: string;

  @ApiPropertyOptional({
    type: DocumentMemberSummaryDto,
    description: '成员摘要（仅列表接口返回）',
  })
  member?: DocumentMemberSummaryDto;
}
