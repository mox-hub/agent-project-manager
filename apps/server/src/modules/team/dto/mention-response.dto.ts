import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberSummaryResponseDto } from './member-response.dto';

/** Prisma Mention（JSON 序列化形态） */
export class MentionResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  memberId: string | null;

  @ApiProperty({ description: '来源类型', example: 'task' })
  sourceType: string;

  @ApiProperty({ description: '来源实体 ID' })
  sourceId: string;

  @ApiProperty({ description: '提及上下文文本' })
  content: string;

  @ApiProperty({ description: '是否已读' })
  isRead: boolean;

  @ApiProperty({ description: '创建时间（ISO）' })
  createdAt: string;
}

/** GET /mentions/source/... 返回项：Mention + 提及的成员摘要（查无时 member 缺省） */
export class MentionWithMemberDto extends MentionResponseDto {
  @ApiPropertyOptional({ type: MemberSummaryResponseDto })
  member?: MemberSummaryResponseDto;
}

export class MentionParseMemberDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  handle: string | null;

  @ApiProperty()
  displayName: string;
}

/** POST /mentions/parse 返回：解析 @handle 后写入的提及数与命中的成员 */
export class MentionParseResponseDto {
  @ApiProperty({ description: '写入的 Mention 数' })
  created: number;

  @ApiProperty({ description: '命中的成员', type: [MentionParseMemberDto] })
  members: MentionParseMemberDto[];
}
