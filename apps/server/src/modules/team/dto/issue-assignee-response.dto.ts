import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberSummaryResponseDto } from './member-response.dto';

/** Prisma IssueAssignee（JSON 序列化形态）；AI 成员自动派发时会附带派发结果字段 */
export class IssueAssigneeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  issueId: string;

  @ApiProperty()
  memberId: string;

  @ApiProperty({ description: '指派时间（ISO）' })
  assignedAt: string;

  @ApiPropertyOptional({
    description: '仅 AI 成员指派且自动派发成功时返回',
    type: String,
  })
  executionRunId?: string;

  @ApiPropertyOptional({
    description: '仅 AI 成员自动派发失败时返回（不阻塞指派）',
    type: String,
  })
  dispatchError?: string;
}

/** GET /issue-assignees/issue/:issueId 返回项：指派 + 成员摘要（查无时 member 缺省） */
export class IssueAssigneeWithMemberDto extends IssueAssigneeResponseDto {
  @ApiPropertyOptional({ type: MemberSummaryResponseDto })
  member?: MemberSummaryResponseDto;
}

export class IssueAssigneeTaskProjectDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  color?: string | null;
}

export class IssueAssigneeTaskDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ description: '任务状态（StatusDefinition key）' })
  status: string;

  @ApiProperty()
  priority: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  projectId: string | null;

  @ApiPropertyOptional({
    description: '所属项目摘要（查无时缺省）',
    type: IssueAssigneeTaskProjectDto,
  })
  project?: IssueAssigneeTaskProjectDto;
}

/** GET /issue-assignees/member/:memberId 返回项：指派 + 任务摘要（查无时 task 缺省） */
export class IssueAssigneeWithTaskDto extends IssueAssigneeResponseDto {
  @ApiPropertyOptional({ type: IssueAssigneeTaskDto })
  task?: IssueAssigneeTaskDto;
}

/** Prisma IssueWatcher（JSON 序列化形态） */
export class IssueWatcherResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  issueId: string;

  @ApiProperty()
  memberId: string;

  @ApiProperty({ description: '创建时间（ISO）' })
  createdAt: string;
}

/** GET /issue-assignees/issue/:issueId/watchers 返回项：watcher + 成员摘要 */
export class IssueWatcherWithMemberDto extends IssueWatcherResponseDto {
  @ApiPropertyOptional({ type: MemberSummaryResponseDto })
  member?: MemberSummaryResponseDto;
}
