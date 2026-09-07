import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberResponseDto } from './member-response.dto';

/** Prisma Team（JSON 序列化形态） */
export class TeamResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ description: '创建者（owner）用户 ID' })
  ownerId: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  avatarUrl: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  color: string | null;

  @ApiPropertyOptional({
    description: '团队提示词（任务上下文注入）',
    type: String,
    nullable: true,
  })
  teamPrompt: string | null;

  @ApiPropertyOptional({
    description: '标签（JSON，通常为 string[]）',
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  tags?: unknown;

  @ApiProperty({ description: '状态', enum: ['active', 'archived'] })
  status: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  slug: string | null;

  @ApiProperty({ description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ description: '更新时间（ISO）' })
  updatedAt: string;
}

export class TeamListItemDto extends TeamResponseDto {
  @ApiPropertyOptional({
    description: '创始人显示名（查无 owner 用户时为 null）',
    type: String,
    nullable: true,
  })
  ownerName: string | null;

  @ApiProperty({ description: '团队成员数（聚合）' })
  memberCount: number;
}

/** GET /teams 返回：{ teams, total } */
export class TeamListResponseDto {
  @ApiProperty({ type: [TeamListItemDto] })
  teams: TeamListItemDto[];

  @ApiProperty({ description: '符合条件的总数' })
  total: number;
}

export class TeamMemberResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  teamId: string;

  @ApiProperty()
  memberId: string;

  @ApiProperty({ description: '团队角色', enum: ['owner', 'admin', 'member'] })
  role: string;

  @ApiProperty({ description: '加入时间（ISO）' })
  joinedAt: string;
}

/** GET /teams/:id/members 返回项：成员关系 + Member 详情（查无时 member 缺省） */
export class TeamMemberListItemDto extends TeamMemberResponseDto {
  @ApiPropertyOptional({ type: MemberResponseDto })
  member?: MemberResponseDto;
}

export class TeamProjectBindingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  teamId: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty({ description: '绑定时间（ISO）' })
  createdAt: string;
}

export class TeamProjectSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  color?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  icon?: string | null;
}

/** GET /teams/:id/projects 返回项：绑定 + 项目摘要（查无时 project 缺省） */
export class TeamProjectListItemDto extends TeamProjectBindingResponseDto {
  @ApiPropertyOptional({ type: TeamProjectSummaryDto })
  project?: TeamProjectSummaryDto;
}

/** Prisma TeamInvite（JSON 序列化形态） */
export class TeamInviteResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  teamId: string;

  @ApiProperty({ description: '被邀邮箱（可为空串）' })
  email: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  memberId: string | null;

  @ApiProperty({ description: '受邀角色', example: 'member' })
  role: string;

  @ApiProperty({ description: '邀请 token（邀请链接参数）' })
  token: string;

  @ApiProperty({
    description: '邀请状态',
    enum: ['pending', 'accepted', 'revoked', 'expired'],
  })
  status: string;

  @ApiProperty({ description: '过期时间（ISO）' })
  expiresAt: string;

  @ApiPropertyOptional({
    description: '接受时间（ISO）',
    type: String,
    nullable: true,
  })
  acceptedAt: string | null;

  @ApiProperty({ description: '创建时间（ISO）' })
  createdAt: string;
}

/** GET /teams/:id 返回：Team + 聚合字段 */
export class TeamDetailResponseDto extends TeamResponseDto {
  @ApiPropertyOptional({ type: String, nullable: true })
  ownerName: string | null;

  @ApiProperty({ type: [TeamMemberListItemDto] })
  members: TeamMemberListItemDto[];

  @ApiProperty({ type: [TeamProjectListItemDto] })
  projects: TeamProjectListItemDto[];

  @ApiProperty({ description: '成员数（冗余聚合）' })
  memberCount: number;

  @ApiProperty({ description: '绑定项目数（冗余聚合）' })
  projectCount: number;
}

export class TeamTokenDailyDto {
  @ApiProperty({ description: '日期（YYYY-MM-DD）' })
  date: string;

  @ApiProperty()
  promptTokens: number;

  @ApiProperty()
  completionTokens: number;

  @ApiProperty()
  totalTokens: number;

  @ApiProperty()
  estimatedCost: number;
}

export class TeamTokenTotalsDto {
  @ApiProperty()
  promptTokens: number;

  @ApiProperty()
  completionTokens: number;

  @ApiProperty()
  totalTokens: number;

  @ApiProperty()
  estimatedCost: number;
}

export class TeamTokenUsageDto {
  @ApiProperty({ type: [TeamTokenDailyDto] })
  daily: TeamTokenDailyDto[];

  @ApiProperty({ type: TeamTokenTotalsDto })
  totals: TeamTokenTotalsDto;
}

export class TeamHeatmapPointDto {
  @ApiProperty({ description: '日期（YYYY-MM-DD）' })
  date: string;

  @ApiProperty({ description: '活动计数' })
  count: number;
}

export class TeamPersonDayRowDto {
  @ApiProperty()
  memberId: string;

  @ApiProperty({ description: '成员显示名' })
  name: string;

  @ApiProperty({ enum: ['human', 'ai_agent'] })
  type: string;

  @ApiProperty({ description: '统计窗口内活跃天数' })
  activeDays: number;

  @ApiProperty({ description: '日费率（分）' })
  rateCents: number;

  @ApiProperty({ description: '是否套用默认费率' })
  rateIsDefault: boolean;

  @ApiProperty({ description: '人天成本（分）' })
  costCents: number;
}

export class TeamPersonDaysDto {
  @ApiProperty({ description: '默认日费率（分）' })
  defaultRateCents: number;

  @ApiProperty({ type: [TeamPersonDayRowDto] })
  rows: TeamPersonDayRowDto[];

  @ApiProperty({ description: '总成本（分）' })
  totalCostCents: number;
}

export class TeamLeaderboardRowDto {
  @ApiProperty()
  memberId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ['human', 'ai_agent'] })
  type: string;

  @ApiProperty({ description: '活动计数' })
  activityCount: number;

  @ApiProperty({ description: 'Token 总用量' })
  totalTokens: number;
}

/** GET /teams/:id/stats/overview 返回（team-stats.service TeamStatsOverview） */
export class TeamStatsOverviewResponseDto {
  @ApiProperty({ description: '团队成员数' })
  memberCount: number;

  @ApiProperty({ description: '人类成员数' })
  humanCount: number;

  @ApiProperty({ description: 'AI 成员数' })
  aiCount: number;

  @ApiProperty({ type: TeamTokenUsageDto })
  tokenUsage: TeamTokenUsageDto;

  @ApiProperty({
    description: '活跃热力图（按日）',
    type: [TeamHeatmapPointDto],
  })
  heatmap: TeamHeatmapPointDto[];

  @ApiProperty({ type: TeamPersonDaysDto })
  personDays: TeamPersonDaysDto;

  @ApiProperty({
    description: '活跃/Token 排行榜',
    type: [TeamLeaderboardRowDto],
  })
  leaderboard: TeamLeaderboardRowDto[];
}

export class TeamProjectStatsTotalsDto {
  @ApiProperty()
  taskCount: number;

  @ApiProperty()
  todoCount: number;

  @ApiProperty()
  inProgressCount: number;

  @ApiProperty()
  inReviewCount: number;

  @ApiProperty()
  doneCount: number;

  @ApiProperty()
  overdueCount: number;

  @ApiProperty({ description: '完成率（百分比整数）' })
  doneRate: number;

  @ApiProperty({ description: '平均进度（百分比整数）' })
  avgProgress: number;
}

export class TeamProjectStatsProjectDto {
  @ApiProperty()
  projectId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  color: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  icon: string | null;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  healthStatus: string | null;

  @ApiProperty({ description: '项目进度（0-100）' })
  progress: number;

  @ApiPropertyOptional({
    description: '目标日期（ISO）',
    type: String,
    nullable: true,
  })
  targetDate: string | null;

  @ApiProperty()
  taskCount: number;

  @ApiProperty()
  todoCount: number;

  @ApiProperty()
  inProgressCount: number;

  @ApiProperty()
  inReviewCount: number;

  @ApiProperty()
  doneCount: number;

  @ApiProperty()
  overdueCount: number;
}

/** GET /teams/:id/stats/projects 返回（team-stats.service TeamProjectStats） */
export class TeamProjectStatsResponseDto {
  @ApiProperty({ description: '绑定项目数' })
  projectCount: number;

  @ApiProperty({ type: TeamProjectStatsTotalsDto })
  totals: TeamProjectStatsTotalsDto;

  @ApiProperty({ type: [TeamProjectStatsProjectDto] })
  projects: TeamProjectStatsProjectDto[];
}
