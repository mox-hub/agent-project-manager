import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IssueListItemDto,
  IssuePageMetaDto,
} from '../../issue/dto/issue-response.dto';

/**
 * Project 模块响应契约（裸数据口径，不含 TransformInterceptor 信封）。
 * Prisma DateTime → ISO 字符串；Json 列以 Object 描述。
 */

/** 项目用户摘要（owner / member.user） */
export class ProjectUserSummaryDto {
  @ApiProperty({ type: String, description: '用户 ID' })
  id: string;

  @ApiProperty({ type: String, description: '用户名' })
  username: string;

  @ApiProperty({ type: String, description: '显示名' })
  displayName: string;

  @ApiPropertyOptional({
    type: String,
    description: '头像 URL',
    nullable: true,
  })
  avatarUrl?: string | null;
}

/** 项目成员行（ProjectMember + user 摘要） */
export class ProjectMemberResponseDto {
  @ApiProperty({ type: String, description: '项目 ID' })
  projectId: string;

  @ApiProperty({ type: String, description: '用户 ID' })
  userId: string;

  @ApiProperty({
    type: String,
    description: "'owner' | 'maintainer' | 'member' | 'guest'",
  })
  role: string;

  @ApiProperty({ type: String, description: '加入时间（ISO）' })
  joinedAt: string;

  @ApiPropertyOptional({
    description: '元数据（任意 JSON）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({ type: ProjectUserSummaryDto, description: '用户摘要' })
  user: ProjectUserSummaryDto;
}

/** 项目所属团队摘要（TeamProject 裸联表二次拼装） */
export class ProjectTeamDto {
  @ApiProperty({ type: String, description: '团队 ID' })
  id: string;

  @ApiProperty({ type: String, description: '团队名' })
  name: string;

  @ApiPropertyOptional({
    type: String,
    description: '团队颜色',
    nullable: true,
  })
  color?: string | null;
}

/** 计数聚合（_count） */
export class ProjectCountDto {
  @ApiProperty({ type: Number, description: '工单数' })
  issues: number;

  @ApiPropertyOptional({ type: Number, description: '迭代数' })
  iterations?: number;

  @ApiPropertyOptional({ type: Number, description: '里程碑数（仅详情返回）' })
  milestones?: number;
}

/** Project 标量字段 */
export class ProjectBaseDto {
  @ApiProperty({ type: String, description: '项目 ID' })
  id: string;

  @ApiProperty({ type: String, description: '项目名' })
  name: string;

  @ApiPropertyOptional({ type: String, description: '描述', nullable: true })
  description?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '项目编码（唯一）',
    nullable: true,
  })
  projectCode?: string | null;

  @ApiPropertyOptional({ type: String, description: '图标', nullable: true })
  icon?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '颜色（HEX）',
    nullable: true,
  })
  color?: string | null;

  @ApiProperty({
    type: String,
    description: "'personal' | 'team' | 'experiment' | 'enterprise'",
  })
  type: string;

  @ApiProperty({
    type: String,
    description: "'private' | 'internal' | 'public'",
  })
  visibility: string;

  @ApiProperty({ type: String, description: "'active' | 'archived'" })
  status: string;

  @ApiProperty({
    type: String,
    description: "'local' | 'github_projects' | 'linear' | 'jira'",
  })
  source: string;

  @ApiProperty({
    type: String,
    description: "'low' | 'medium' | 'high' | 'urgent'",
  })
  priority: string;

  @ApiProperty({
    type: String,
    description:
      "'backlog' | 'planned' | 'in_progress' | 'completed' | 'canceled'",
  })
  workflowStatus: string;

  @ApiProperty({
    type: String,
    description: "'on_track' | 'at_risk' | 'off_track'",
  })
  healthStatus: string;

  @ApiProperty({
    type: String,
    description: "'low' | 'medium' | 'high' | 'critical'",
  })
  riskLevel: string;

  @ApiProperty({ type: Number, description: '进度（0-100）' })
  progress: number;

  @ApiPropertyOptional({
    type: String,
    description: '负责人 User ID',
    nullable: true,
  })
  ownerId?: string | null;

  @ApiPropertyOptional({
    description: '开始日期（ISO）',
    type: String,
    nullable: true,
  })
  startDate?: string | null;

  @ApiPropertyOptional({
    description: '目标日期（ISO）',
    type: String,
    nullable: true,
  })
  targetDate?: string | null;

  @ApiPropertyOptional({
    description: '完成日期（ISO）',
    type: String,
    nullable: true,
  })
  completedAt?: string | null;

  @ApiPropertyOptional({ type: String, description: '分类', nullable: true })
  category?: string | null;

  @ApiPropertyOptional({
    type: Number,
    description: '估算点数',
    nullable: true,
  })
  estimatePoints?: number | null;

  @ApiPropertyOptional({
    description: '最近活动时间（ISO）',
    type: String,
    nullable: true,
  })
  lastActivityAt?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '阻塞原因',
    nullable: true,
  })
  blockedReason?: string | null;

  @ApiProperty({ type: Number, description: '健康分（0-100）' })
  healthScore: number;

  @ApiPropertyOptional({
    description: '项目配置（任意 JSON，含模块开关/默认状态等）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  config?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    type: String,
    description: '文档 Git 仓库路径',
    nullable: true,
  })
  documentsRepoPath?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '外部同步 provider',
    nullable: true,
  })
  externalProvider?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '外部系统项目 ID',
    nullable: true,
  })
  externalProjectId?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: "'synced' | 'pending' | 'error' | 'never_synced'",
    nullable: true,
  })
  syncStatus?: string | null;

  @ApiPropertyOptional({
    description: '最近同步时间（ISO）',
    type: String,
    nullable: true,
  })
  lastSyncAt?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '同步错误信息',
    nullable: true,
  })
  syncErrorMessage?: string | null;

  @ApiProperty({
    type: Boolean,
    description: '外部 provider 管理字段时为 true',
  })
  fieldsLockedExternally: boolean;

  @ApiProperty({ type: String, description: '创建人 User ID' })
  createdBy: string;

  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;
}

/** 项目（裸字段，archive/restore/unbindSync 返回） */
export class ProjectResponseDto extends ProjectBaseDto {}

/** 项目详情（findOne/create/update：members + owner [+ teams] [+ _count]） */
export class ProjectDetailResponseDto extends ProjectBaseDto {
  @ApiProperty({
    type: [ProjectMemberResponseDto],
    description: '项目成员列表',
  })
  members: ProjectMemberResponseDto[];

  @ApiPropertyOptional({
    type: ProjectUserSummaryDto,
    description: '负责人',
    nullable: true,
  })
  owner?: ProjectUserSummaryDto | null;

  @ApiPropertyOptional({
    type: [ProjectTeamDto],
    description: '所属团队（仅 findOne 拼装返回）',
  })
  teams?: ProjectTeamDto[];

  @ApiPropertyOptional({
    type: ProjectCountDto,
    description: '关联计数（仅 findOne 返回）',
  })
  _count?: ProjectCountDto;
}

/** 项目列表项（findAll：members + owner + teams + _count） */
export class ProjectListItemDto extends ProjectBaseDto {
  @ApiProperty({
    type: [ProjectMemberResponseDto],
    description: '项目成员列表',
  })
  members: ProjectMemberResponseDto[];

  @ApiPropertyOptional({
    type: ProjectUserSummaryDto,
    description: '负责人',
    nullable: true,
  })
  owner?: ProjectUserSummaryDto | null;

  @ApiProperty({ type: [ProjectTeamDto], description: '所属团队' })
  teams: ProjectTeamDto[];

  @ApiProperty({ type: ProjectCountDto, description: '工单/迭代计数' })
  _count: ProjectCountDto;
}

/** 项目分页列表（findAll：{ items, total, page, pageSize, totalPages }） */
export class ProjectPageResponseDto {
  @ApiProperty({ type: [ProjectListItemDto], description: '当前页项目' })
  items: ProjectListItemDto[];

  @ApiProperty({ type: Number, description: '总条数' })
  total: number;

  @ApiProperty({ type: Number, description: '当前页码' })
  page: number;

  @ApiProperty({ type: Number, description: '每页条数' })
  pageSize: number;

  @ApiProperty({ type: Number, description: '总页数' })
  totalPages: number;
}

/** 项目工单分页列表（GET :projectId/issues|bugs：{ data, meta }） */
export class ProjectIssuePageResponseDto {
  @ApiProperty({
    type: [IssueListItemDto],
    description: '当前页工单（含 milestone/aiAgent 等预加载）',
  })
  data: IssueListItemDto[];

  @ApiProperty({ type: IssuePageMetaDto, description: '分页信息' })
  meta: IssuePageMetaDto;
}

/** 迭代关联计数（_count） */
export class IterationCountDto {
  @ApiProperty({ type: Number, description: '迭代内工单数' })
  issues: number;
}

/** 迭代（Iteration + _count.issues） */
export class IterationResponseDto {
  @ApiProperty({ type: String, description: '迭代 ID' })
  id: string;

  @ApiProperty({ type: String, description: '项目 ID' })
  projectId: string;

  @ApiProperty({ type: String, description: '迭代名' })
  name: string;

  @ApiPropertyOptional({
    type: String,
    description: '迭代目标',
    nullable: true,
  })
  goal?: string | null;

  @ApiProperty({ type: String, description: '开始日期（ISO）' })
  startDate: string;

  @ApiProperty({ type: String, description: '结束日期（ISO）' })
  endDate: string;

  @ApiPropertyOptional({
    type: Number,
    description: '容量（点数）',
    nullable: true,
  })
  capacity?: number | null;

  @ApiProperty({
    type: String,
    description: "'planned' | 'active' | 'completed' | 'cancelled'",
  })
  status: string;

  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;

  @ApiProperty({
    type: IterationCountDto,
    description: '关联计数（{ issues }）',
  })
  _count: IterationCountDto;
}

/** 里程碑任务摘要 */
export class MilestoneTaskSummaryDto {
  @ApiProperty({ type: String, description: '工单 ID' })
  id: string;

  @ApiProperty({ type: String, description: '标题' })
  title: string;

  @ApiProperty({ type: String, description: '状态' })
  status: string;

  @ApiProperty({ type: String, description: '优先级' })
  priority: string;
}

/** 里程碑概要（findAll：含任务统计） */
export class MilestoneSummaryResponseDto {
  @ApiProperty({ type: String, description: '里程碑 ID' })
  id: string;

  @ApiProperty({ type: String, description: '里程碑名' })
  name: string;

  @ApiProperty({
    type: String,
    description:
      "'planned' | 'in_progress' | 'reached' | 'missed' | 'cancelled'",
  })
  status: string;

  @ApiProperty({
    description: '目标日期（ISO，未设置为 null）',
    type: String,
    nullable: true,
  })
  targetDate: string | null;

  @ApiPropertyOptional({ type: String, description: '描述', nullable: true })
  description?: string | null;

  @ApiProperty({ type: Number, description: '关联任务数' })
  taskCount: number;

  @ApiProperty({ type: [MilestoneTaskSummaryDto], description: '关联任务摘要' })
  tasks: MilestoneTaskSummaryDto[];
}

/** 里程碑（裸字段，create 返回） */
export class MilestoneResponseDto {
  @ApiProperty({ type: String, description: '里程碑 ID' })
  id: string;

  @ApiProperty({ type: String, description: '项目 ID', nullable: true })
  projectId: string | null;

  @ApiPropertyOptional({ type: String, description: '迭代 ID', nullable: true })
  iterationId?: string | null;

  @ApiProperty({ type: String, description: '里程碑名' })
  name: string;

  @ApiPropertyOptional({ type: String, description: '描述', nullable: true })
  description?: string | null;

  @ApiPropertyOptional({
    description: '目标日期（ISO）',
    type: String,
    nullable: true,
  })
  targetDate?: string | null;

  @ApiProperty({
    type: String,
    description:
      "'planned' | 'in_progress' | 'reached' | 'missed' | 'cancelled'",
  })
  status: string;

  @ApiPropertyOptional({
    description: '元数据（任意 JSON）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;
}

/** 外部项目链接（ExternalProjectLink） */
export class ExternalProjectLinkResponseDto {
  @ApiProperty({ type: String, description: '链接 ID' })
  id: string;

  @ApiProperty({ type: String, description: '项目 ID' })
  projectId: string;

  @ApiProperty({
    type: String,
    description: "'github_projects' | 'linear' | 'jira'",
  })
  provider: string;

  @ApiProperty({ type: String, description: '外部项目 ID' })
  externalProjectId: string;

  @ApiProperty({ type: String, description: '外部项目 URL' })
  externalProjectUrl: string;

  @ApiPropertyOptional({
    description: '同步配置（任意 JSON）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  syncConfig?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: '最近同步时间（ISO）',
    type: String,
    nullable: true,
  })
  lastSyncAt?: string | null;

  @ApiProperty({ type: String, description: "'active' | 'paused' | 'error'" })
  syncStatus: string;

  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;
}

/** 项目文档链接（ProjectDocLink / ProjectApiDocLink 同构共用） */
export class ProjectDocLinkResponseDto {
  @ApiProperty({ type: String, description: '链接 ID' })
  id: string;

  @ApiProperty({ type: String, description: '项目 ID' })
  projectId: string;

  @ApiProperty({ type: String, description: '显示名' })
  label: string;

  @ApiProperty({ type: String, description: '链接 URL' })
  url: string;

  @ApiProperty({
    type: String,
    description:
      "文档链接：'wiki'|'spec'|'design'|'other'；API 文档：'openapi'|'apifox'|'postman'|'other'",
  })
  type: string;

  @ApiPropertyOptional({ type: String, description: '描述', nullable: true })
  description?: string | null;

  @ApiProperty({ type: Boolean, description: '是否已被 AI 索引' })
  aiIndexed: boolean;

  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;
}

/** 项目健康快照（ProjectHealthSnapshot） */
export class ProjectHealthSnapshotResponseDto {
  @ApiProperty({ type: String, description: '快照 ID' })
  id: string;

  @ApiProperty({ type: String, description: '项目 ID' })
  projectId: string;

  @ApiProperty({ type: String, description: '日期（YYYY-MM-DD）' })
  date: string;

  @ApiProperty({ type: Number, description: '健康分（0-100）' })
  healthScore: number;

  @ApiProperty({
    description: '各维度得分明细（任意 JSON）',
    type: Object,
    additionalProperties: true,
  })
  breakdown: Record<string, unknown>;

  @ApiProperty({ type: String, description: '计算时间（ISO）' })
  computedAt: string;
}

/** 项目 AI 上下文（ProjectAIContext） */
export class ProjectAIContextResponseDto {
  @ApiProperty({ type: String, description: '记录 ID' })
  id: string;

  @ApiProperty({ type: String, description: '项目 ID' })
  projectId: string;

  @ApiPropertyOptional({
    type: [String],
    description: '技术栈（JSON string[]）',
  })
  techStack?: string[] | null;

  @ApiPropertyOptional({ type: [String], description: '语言（JSON string[]）' })
  languages?: string[] | null;

  @ApiPropertyOptional({ type: [String], description: '框架（JSON string[]）' })
  frameworks?: string[] | null;

  @ApiPropertyOptional({
    type: [String],
    description: '领域标签（JSON string[]）',
  })
  domainTags?: string[] | null;

  @ApiPropertyOptional({
    type: String,
    description: "'solo' | 'small' | 'medium' | 'large'",
    nullable: true,
  })
  teamSizeCategory?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: "'inception' | 'development' | 'maintenance' | 'sunset'",
    nullable: true,
  })
  lifecyclePhase?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: "'low' | 'medium' | 'high' | 'critical'",
    nullable: true,
  })
  complexityLevel?: string | null;

  @ApiPropertyOptional({
    description:
      '风险指标（{ overdueTaskRatio, blockedTaskCount, velocityTrend, ciFailureRate }）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  riskIndicators?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    type: Number,
    description: '健康分（0-100）',
    nullable: true,
  })
  healthScore?: number | null;

  @ApiPropertyOptional({
    type: String,
    description: '自动摘要',
    nullable: true,
  })
  autoSummary?: string | null;

  @ApiPropertyOptional({
    description: '最近计算时间（ISO）',
    type: String,
    nullable: true,
  })
  lastComputedAt?: string | null;

  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;
}

/** 项目仪表盘聚合（getDashboardSummary） */
export class ProjectDashboardSummaryResponseDto {
  @ApiProperty({
    description:
      '项目元信息（id/name/状态/健康/负责人 owner/members[{user,role}] 等）',
    type: Object,
    additionalProperties: true,
  })
  projectMeta: Record<string, unknown>;

  @ApiProperty({
    description:
      '任务统计（{ total, todo, inProgress, inReview, done, overdue }）',
    type: Object,
    additionalProperties: true,
  })
  taskStats: Record<string, unknown>;

  @ApiProperty({
    description: '看板预览（列数组，每列 { id, title, count, tasks[] }）',
    type: [Object],
    items: { type: 'object', additionalProperties: true },
  })
  boardPreview: Record<string, unknown>[];

  @ApiProperty({
    description:
      '健康维度（{ currentScore, trend30d, latestBreakdown, details, lastEvaluatedAt }）',
    type: Object,
    additionalProperties: true,
  })
  health: Record<string, unknown>;

  @ApiProperty({
    description:
      'AI 评估（{ score, complexity, lifecycle, teamSize, summary, lastComputedAt, details }）',
    type: Object,
    additionalProperties: true,
  })
  ai: Record<string, unknown>;

  @ApiProperty({
    description:
      '成员负载（数组，元素 { memberId, memberName, taskCount, percentage, status }）',
    type: [Object],
    items: { type: 'object', additionalProperties: true },
  })
  teamWorkload: Record<string, unknown>[];

  @ApiProperty({
    description:
      '分析数据（{ deliveryTimeline, workloadDistribution, aiRiskDistribution, aiComplexityDistribution }）',
    type: Object,
    additionalProperties: true,
  })
  analytics: Record<string, unknown>;

  @ApiProperty({
    description:
      '动态流（数组，元素 { id, type, summary, source, timestamp, issueId }）',
    type: [Object],
    items: { type: 'object', additionalProperties: true },
  })
  activityFeed: Record<string, unknown>[];

  @ApiProperty({
    description: '里程碑摘要（数组，元素 { id, name, status, targetDate }）',
    type: [Object],
    items: { type: 'object', additionalProperties: true },
  })
  milestones: Record<string, unknown>[];

  @ApiProperty({
    description:
      '迭代摘要（数组，元素 { id, name, status, startDate, endDate }）',
    type: [Object],
    items: { type: 'object', additionalProperties: true },
  })
  iterations: Record<string, unknown>[];

  @ApiProperty({
    description:
      '集成概览（{ repositories[], externalLinksCount, docLinksCount, apiDocLinksCount }）',
    type: Object,
    additionalProperties: true,
  })
  integrations: Record<string, unknown>;
}
