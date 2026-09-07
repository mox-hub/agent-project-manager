import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Issue 模块响应契约（裸数据口径，不含 TransformInterceptor 信封）。
 *
 * 口径说明：
 * - Prisma DateTime 序列化后为 ISO 字符串；
 * - Json 列（customFields / metadata / todoItems / gitRefs 等）以 Object 描述；
 * - withBuiltinCompat 会把内置 bug 六字段从 customFields 回填到顶层（可选）。
 */

/** 关联标签（IssueTag → Tag） */
export class IssueTagDto {
  @ApiProperty({ type: String, description: '标签 ID' })
  id: string;

  @ApiProperty({
    type: String,
    description: '归属项目 ID（全局标签为 null）',
    nullable: true,
  })
  projectId: string | null;

  @ApiProperty({ type: String, description: '标签名' })
  name: string;

  @ApiPropertyOptional({
    type: String,
    description: '颜色（HEX）',
    nullable: true,
  })
  color?: string | null;

  @ApiPropertyOptional({ type: String, description: '描述', nullable: true })
  description?: string | null;

  @ApiProperty({
    type: String,
    description: "标签域：'project' | 'task' | 'bug' | 'document'",
  })
  resourceType: string;

  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;
}

/** 工单-标签关联（issueTags 元素） */
export class IssueTagLinkDto {
  @ApiProperty({ type: String, description: '工单 ID' })
  issueId: string;

  @ApiProperty({ type: String, description: '标签 ID' })
  tagId: string;

  @ApiProperty({ type: String, description: '归属项目 ID', nullable: true })
  projectId: string | null;

  @ApiProperty({ type: IssueTagDto, description: '标签详情' })
  tag: IssueTagDto;
}

/** 用户摘要（assignee / reporter / member.user） */
export class IssueUserSummaryDto {
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

/** AI 成员摘要（enrichTaskWithAgent 回填） */
export class IssueAgentSummaryDto {
  @ApiProperty({ type: String, description: 'Member ID（即 aiAgentId）' })
  id: string;

  @ApiProperty({
    type: String,
    description: 'Agent 显示名（Member.displayName）',
  })
  name: string;

  @ApiProperty({ type: String, description: "成员类型（'ai_agent'）" })
  type: string;

  @ApiProperty({ type: String, description: '成员状态' })
  status: string;
}

/** 里程碑摘要 */
export class IssueMilestoneSummaryDto {
  @ApiProperty({ type: String, description: '里程碑 ID' })
  id: string;

  @ApiProperty({ type: String, description: '里程碑名' })
  name: string;

  @ApiProperty({ type: String, description: '里程碑状态' })
  status: string;
}

/** 迭代摘要 */
export class IssueIterationSummaryDto {
  @ApiProperty({ type: String, description: '迭代 ID' })
  id: string;

  @ApiProperty({ type: String, description: '迭代名' })
  name: string;

  @ApiProperty({ type: String, description: '迭代状态' })
  status: string;
}

/** 项目摘要 */
export class IssueProjectSummaryDto {
  @ApiProperty({ type: String, description: '项目 ID' })
  id: string;

  @ApiProperty({ type: String, description: '项目名' })
  name: string;
}

/** 列表项 _count（findMany include） */
export class IssueCountDto {
  @ApiProperty({ type: Number, description: '子任务数' })
  subIssues: number;

  @ApiProperty({ type: Number, description: '依赖数' })
  dependencies: number;
}

/** Issue 标量字段 + 内置 bug 六字段兼容回填 */
export class IssueBaseDto {
  @ApiProperty({ type: String, description: '工单 ID' })
  id: string;

  @ApiPropertyOptional({
    type: String,
    description: '项目 ID（收件箱任务为 null）',
    nullable: true,
  })
  projectId?: string | null;

  @ApiPropertyOptional({ type: String, description: '迭代 ID', nullable: true })
  iterationId?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '父任务 ID',
    nullable: true,
  })
  parentIssueId?: string | null;

  @ApiProperty({ type: String, description: '标题' })
  title: string;

  @ApiPropertyOptional({ type: String, description: '描述', nullable: true })
  description?: string | null;

  @ApiProperty({ type: String, description: '状态（StatusDefinition.key）' })
  status: string;

  @ApiProperty({
    type: String,
    description: "优先级：'low' | 'medium' | 'high' | 'critical'",
  })
  priority: string;

  @ApiPropertyOptional({
    type: String,
    description: '负责人 User ID',
    nullable: true,
  })
  assigneeId?: string | null;

  @ApiProperty({ type: String, description: "'user' | 'ai_agent'" })
  assigneeType: string;

  @ApiPropertyOptional({
    type: String,
    description: 'AI 成员 ID（Member.id）',
    nullable: true,
  })
  aiAgentId?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '报告人 User ID',
    nullable: true,
  })
  reporterId?: string | null;

  @ApiPropertyOptional({
    description: '开始日期（ISO）',
    type: String,
    nullable: true,
  })
  startDate?: string | null;

  @ApiPropertyOptional({
    description: '截止日期（ISO）',
    type: String,
    nullable: true,
  })
  dueDate?: string | null;

  @ApiPropertyOptional({
    type: Number,
    description: '预估工时（分钟）',
    nullable: true,
  })
  estimate?: number | null;

  @ApiPropertyOptional({
    type: Number,
    description: '实际工时（分钟）',
    nullable: true,
  })
  actualSpent?: number | null;

  @ApiPropertyOptional({
    description: 'Git 关联（任意 JSON）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  gitRefs?: Record<string, unknown> | null;

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

  @ApiProperty({
    type: String,
    description: "类型（遗留口径）：'task' | 'bug'",
  })
  type: string;

  @ApiPropertyOptional({
    type: String,
    description: '工单类型 ID（IssueType.id，事实源）',
    nullable: true,
  })
  typeId?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '短 ID（如 APM-PF-001）',
    nullable: true,
  })
  shortId?: string | null;

  @ApiPropertyOptional({
    description: '工单类型自定义字段（内置 bug 六字段已迁入）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  customFields?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: '待办事项（任意 JSON，通常为数组）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  todoItems?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    type: String,
    description: '里程碑 ID',
    nullable: true,
  })
  milestoneId?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '外部同步 provider（linear/jira）',
    nullable: true,
  })
  externalProvider?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '外部系统工单 ID',
    nullable: true,
  })
  externalIssueId?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '外部系统可读标识',
    nullable: true,
  })
  externalIdentifier?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '外部系统 URL',
    nullable: true,
  })
  externalUrl?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: "'synced' | 'pending' | 'error'",
    nullable: true,
  })
  syncStatus?: string | null;

  @ApiPropertyOptional({
    description: '最近外部同步时间（ISO）',
    type: String,
    nullable: true,
  })
  lastExternalSyncAt?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '乐观并发版本（外部 updatedAt）',
    nullable: true,
  })
  externalVersion?: string | null;

  @ApiPropertyOptional({
    description: '本地变更时间（双向同步冲突判断）',
    type: String,
    nullable: true,
  })
  localUpdatedAt?: string | null;

  // ─── withBuiltinCompat：内置 bug 六字段顶层兼容回填（可选） ───

  @ApiPropertyOptional({
    type: String,
    description: '[兼容] 严重程度（customFields 回填）',
    nullable: true,
  })
  severity?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '[兼容] 复现概率（customFields 回填）',
    nullable: true,
  })
  bugReproducibility?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '[兼容] 复现步骤（customFields 回填）',
    nullable: true,
  })
  bugStepsToReproduce?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '[兼容] 复现环境（customFields 回填）',
    nullable: true,
  })
  bugEnvironment?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '[兼容] 预期结果（customFields 回填）',
    nullable: true,
  })
  bugExpectedResult?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '[兼容] 实际结果（customFields 回填）',
    nullable: true,
  })
  bugActualResult?: string | null;
}

/** 列表项（findAll / findAllTasks / findAllBugs / findAccessibleTasks / findBugs） */
export class IssueListItemDto extends IssueBaseDto {
  @ApiPropertyOptional({
    type: IssueUserSummaryDto,
    description: '负责人',
    nullable: true,
  })
  assignee?: IssueUserSummaryDto | null;

  @ApiPropertyOptional({
    type: IssueUserSummaryDto,
    description: '报告人',
    nullable: true,
  })
  reporter?: IssueUserSummaryDto | null;

  @ApiProperty({ type: [IssueTagLinkDto], description: '标签关联' })
  issueTags: IssueTagLinkDto[];

  @ApiProperty({ type: IssueCountDto, description: '子任务/依赖计数' })
  _count: IssueCountDto;

  @ApiPropertyOptional({
    type: IssueMilestoneSummaryDto,
    description: '里程碑（仅手动拼装 milestone 的端点返回）',
    nullable: true,
  })
  milestone?: IssueMilestoneSummaryDto | null;

  @ApiPropertyOptional({
    type: [Object],
    items: { type: 'object', additionalProperties: true },
    description:
      '里程碑关联（findBugs 端点返回：MilestoneTask[] 含 milestone 摘要）',
  })
  milestoneTasks?: Array<Record<string, unknown>>;

  @ApiPropertyOptional({
    type: IssueProjectSummaryDto,
    description: '项目摘要（findAccessibleTasks 返回）',
  })
  project?: IssueProjectSummaryDto;

  @ApiPropertyOptional({
    type: IssueAgentSummaryDto,
    description: 'AI 成员（enrich 端点返回）',
    nullable: true,
  })
  aiAgent?: IssueAgentSummaryDto | null;
}

/** 分页 meta（{ page, pageSize, total, totalPages }） */
export class IssuePageMetaDto {
  @ApiProperty({ type: Number, description: '当前页码（从 1 起）' })
  page: number;

  @ApiProperty({ type: Number, description: '每页条数' })
  pageSize: number;

  @ApiProperty({ type: Number, description: '总条数' })
  total: number;

  @ApiProperty({ type: Number, description: '总页数' })
  totalPages: number;
}

/** 跨项目分页列表（findAllBugs / findAllTasks / findAccessibleTasks / 项目工单列表） */
export class IssuePageResponseDto {
  @ApiProperty({ type: [IssueListItemDto], description: '当前页工单' })
  data: IssueListItemDto[];

  @ApiProperty({ type: IssuePageMetaDto, description: '分页信息' })
  meta: IssuePageMetaDto;
}

/** 详情：子任务摘要 */
export class IssueSubIssueDto {
  @ApiProperty({ type: String, description: '子任务 ID' })
  id: string;

  @ApiProperty({ type: String, description: '标题' })
  title: string;

  @ApiProperty({ type: String, description: '状态' })
  status: string;

  @ApiProperty({ type: String, description: '优先级' })
  priority: string;
}

/** 详情：父任务摘要 */
export class IssueParentSummaryDto {
  @ApiProperty({ type: String, description: '父任务 ID' })
  id: string;

  @ApiProperty({ type: String, description: '标题' })
  title: string;

  @ApiProperty({ type: String, description: '状态' })
  status: string;
}

/** 详情：依赖（dependencies 元素，含被依赖任务摘要） */
export class IssueDependencyLinkDto {
  @ApiProperty({ type: String, description: '依赖关系 ID' })
  id: string;

  @ApiProperty({ type: String, description: '项目 ID', nullable: true })
  projectId: string | null;

  @ApiProperty({ type: String, description: '工单 ID' })
  issueId: string;

  @ApiProperty({ type: String, description: '被依赖工单 ID' })
  dependsOnIssueId: string;

  @ApiProperty({ type: String, description: "'blocks' | 'relates'" })
  type: string;

  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ type: IssueParentSummaryDto, description: '被依赖任务摘要' })
  dependsOnIssue: IssueParentSummaryDto;
}

/** 详情：阻塞来源（blockedBy 元素，含阻塞任务摘要） */
export class IssueBlockedByLinkDto {
  @ApiProperty({ type: String, description: '依赖关系 ID' })
  id: string;

  @ApiProperty({ type: String, description: '项目 ID', nullable: true })
  projectId: string | null;

  @ApiProperty({ type: String, description: '工单 ID' })
  issueId: string;

  @ApiProperty({ type: String, description: '被依赖工单 ID' })
  dependsOnIssueId: string;

  @ApiProperty({ type: String, description: "'blocks' | 'relates'" })
  type: string;

  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ type: IssueParentSummaryDto, description: '阻塞方任务摘要' })
  issue: IssueParentSummaryDto;
}

/** 工单详情（findOne / create / update / assignAgent / findByShortId） */
export class IssueDetailResponseDto extends IssueBaseDto {
  @ApiPropertyOptional({
    type: IssueUserSummaryDto,
    description: '负责人',
    nullable: true,
  })
  assignee?: IssueUserSummaryDto | null;

  @ApiPropertyOptional({
    type: IssueUserSummaryDto,
    description: '报告人',
    nullable: true,
  })
  reporter?: IssueUserSummaryDto | null;

  @ApiPropertyOptional({
    type: IssueParentSummaryDto,
    description: '父任务',
    nullable: true,
  })
  parentIssue?: IssueParentSummaryDto | null;

  @ApiProperty({ type: [IssueSubIssueDto], description: '子任务列表' })
  subIssues: IssueSubIssueDto[];

  @ApiProperty({ type: [IssueTagLinkDto], description: '标签关联' })
  issueTags: IssueTagLinkDto[];

  @ApiProperty({
    type: [IssueDependencyLinkDto],
    description: '当前工单依赖的任务（dependsOn）',
  })
  dependencies: IssueDependencyLinkDto[];

  @ApiProperty({
    type: [IssueBlockedByLinkDto],
    description: '阻塞当前工单的任务（blockedBy）',
  })
  blockedBy: IssueBlockedByLinkDto[];

  @ApiPropertyOptional({
    type: IssueIterationSummaryDto,
    description: '迭代',
    nullable: true,
  })
  iteration?: IssueIterationSummaryDto | null;

  @ApiPropertyOptional({
    type: IssueMilestoneSummaryDto,
    description: '里程碑',
    nullable: true,
  })
  milestone?: IssueMilestoneSummaryDto | null;

  @ApiPropertyOptional({
    type: IssueAgentSummaryDto,
    description: 'AI 成员',
    nullable: true,
  })
  aiAgent?: IssueAgentSummaryDto | null;
}

/** 审批请求（ApprovalRequest） */
export class ApprovalRequestResponseDto {
  @ApiProperty({ type: String, description: '审批 ID' })
  id: string;

  @ApiProperty({ type: String, description: '执行项 ID（Execution.id）' })
  executionRunId: string;

  @ApiProperty({ type: String, description: '项目 ID' })
  projectId: string;

  @ApiProperty({ type: String, description: '工单 ID', nullable: true })
  issueId: string | null;

  @ApiProperty({ type: String, description: '需审批的操作描述' })
  requestedAction: string;

  @ApiProperty({
    type: String,
    description:
      "操作类型：'tool_call' | 'git_write' | 'terminal_exec' | 'external_sync' | 'status_change' 等",
  })
  actionType: string;

  @ApiProperty({ type: String, description: "'read' | 'write' | 'high_risk'" })
  riskLevel: string;

  @ApiPropertyOptional({
    type: String,
    description: '审批原因',
    nullable: true,
  })
  reason?: string | null;

  @ApiProperty({
    type: String,
    description:
      "'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled' | 'auto_approved'",
  })
  status: string;

  @ApiPropertyOptional({
    type: String,
    description: '审批策略（role:level）',
    nullable: true,
  })
  approverPolicy?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '批准人 User ID',
    nullable: true,
  })
  approvedBy?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '驳回人 User ID',
    nullable: true,
  })
  rejectedBy?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '处理备注',
    nullable: true,
  })
  resolutionNote?: string | null;

  @ApiProperty({ type: String, description: '发起时间（ISO）' })
  requestedAt: string;

  @ApiPropertyOptional({
    description: '处理时间（ISO）',
    type: String,
    nullable: true,
  })
  resolvedAt?: string | null;

  @ApiPropertyOptional({
    description: '过期时间（ISO）',
    type: String,
    nullable: true,
  })
  expiresAt?: string | null;

  @ApiPropertyOptional({
    description: '元数据（任意 JSON）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;
}

/** 执行项（Execution，含审批列表；AI 路径另含项目/工单摘要） */
export class ExecutionRunResponseDto {
  @ApiProperty({ type: String, description: '执行项 ID' })
  id: string;

  @ApiProperty({ type: String, description: '项目 ID' })
  projectId: string;

  @ApiProperty({ type: String, description: '工单 ID', nullable: true })
  issueId: string | null;

  @ApiProperty({
    type: String,
    description: "'human' | 'platform_ai_member' | 'external_agent'",
  })
  subjectType: string;

  @ApiProperty({ type: String, description: '主体 ID（Agent / User）' })
  subjectId: string;

  @ApiProperty({
    type: String,
    description: "'internal' | 'mcp' | 'cli' | 'api' | 'plugin'",
  })
  identitySource: string;

  @ApiProperty({ type: String, description: '执行目标描述' })
  goal: string;

  @ApiPropertyOptional({
    type: String,
    description: '执行项标题',
    nullable: true,
  })
  title?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '执行项描述',
    nullable: true,
  })
  description?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '项目角色',
    nullable: true,
  })
  role?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '级别（Intern/Senior…）',
    nullable: true,
  })
  level?: string | null;

  @ApiProperty({
    type: String,
    description:
      '状态：draft/planned/in_progress/pending_approval/completed/failed/blocked/superseded/approved/rejected',
  })
  status: string;

  @ApiPropertyOptional({
    type: Number,
    description: '预估工时（分钟）',
    nullable: true,
  })
  estimate?: number | null;

  @ApiPropertyOptional({
    type: Number,
    description: '实际工时（分钟）',
    nullable: true,
  })
  actualSpent?: number | null;

  @ApiProperty({ type: Number, description: '工单内排序' })
  order: number;

  @ApiPropertyOptional({
    description: '执行输入（任意 JSON）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  input?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: '执行输出（任意 JSON）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  output?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: '错误详情（任意 JSON）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  errorDetail?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    type: String,
    description: '上下文快照 ID',
    nullable: true,
  })
  contextSnapshotId?: string | null;

  @ApiPropertyOptional({
    description: '开始时间（ISO）',
    type: String,
    nullable: true,
  })
  startedAt?: string | null;

  @ApiPropertyOptional({
    description: '完成时间（ISO）',
    type: String,
    nullable: true,
  })
  completedAt?: string | null;

  @ApiPropertyOptional({
    description: '终止时间（ISO）',
    type: String,
    nullable: true,
  })
  terminatedAt?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '创建人 User ID',
    nullable: true,
  })
  createdBy?: string | null;

  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;

  @ApiPropertyOptional({
    description: '元数据（任意 JSON）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    type: Number,
    description: '总 Token 数',
    nullable: true,
  })
  totalTokens?: number | null;

  @ApiPropertyOptional({
    type: Number,
    description: '总成本（USD）',
    nullable: true,
  })
  totalCost?: number | null;

  @ApiPropertyOptional({
    description: '成本分解 { byModel, byStep }',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  costBreakdown?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    type: String,
    description: '关联验收契约 ID',
    nullable: true,
  })
  acceptanceId?: string | null;

  @ApiProperty({
    type: [ApprovalRequestResponseDto],
    description: '关联审批请求',
  })
  approvals: ApprovalRequestResponseDto[];

  @ApiPropertyOptional({
    type: IssueProjectSummaryDto,
    description: '项目摘要（人工执行项路径返回）',
  })
  project?: IssueProjectSummaryDto;

  @ApiPropertyOptional({
    type: IssueParentSummaryDto,
    description: '工单摘要（人工执行项路径返回）',
  })
  issue?: IssueParentSummaryDto;
}

/** AI 执行创建结果（{ execution, approvalRequest, contextPack }） */
export class ExecutionCreateResponseDto {
  @ApiProperty({
    type: ExecutionRunResponseDto,
    description: '执行项（含审批列表）',
  })
  execution: ExecutionRunResponseDto;

  @ApiProperty({
    type: ApprovalRequestResponseDto,
    description: '审批请求（requiresApproval=false 时为 null）',
    nullable: true,
  })
  approvalRequest: ApprovalRequestResponseDto | null;

  @ApiProperty({
    description: '任务执行上下文包（issue + project/iteration/tag 聚合）',
    type: Object,
    additionalProperties: true,
  })
  contextPack: Record<string, unknown>;
}

/** 执行审批结果（{ execution, approvalRequest }） */
export class ExecutionConfirmResponseDto {
  @ApiProperty({ type: ExecutionRunResponseDto, description: '更新后的执行项' })
  execution: ExecutionRunResponseDto;

  @ApiProperty({
    type: ApprovalRequestResponseDto,
    description: '更新后的审批请求',
  })
  approvalRequest: ApprovalRequestResponseDto;
}

/** 依赖关系（IssueDependency） */
export class IssueDependencyResponseDto {
  @ApiProperty({ type: String, description: '依赖关系 ID' })
  id: string;

  @ApiProperty({ type: String, description: '项目 ID', nullable: true })
  projectId: string | null;

  @ApiProperty({ type: String, description: '工单 ID' })
  issueId: string;

  @ApiProperty({ type: String, description: '被依赖工单 ID' })
  dependsOnIssueId: string;

  @ApiProperty({ type: String, description: "'blocks' | 'relates'" })
  type: string;

  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;
}

/** 工单动态（IssueActivity） */
export class IssueActivityResponseDto {
  @ApiProperty({ type: String, description: '动态 ID' })
  id: string;

  @ApiProperty({ type: String, description: '项目 ID', nullable: true })
  projectId: string | null;

  @ApiProperty({ type: String, description: '工单 ID' })
  issueId: string;

  @ApiPropertyOptional({
    type: String,
    description: '操作人 User ID',
    nullable: true,
  })
  actorId?: string | null;

  @ApiProperty({
    type: String,
    description:
      "'created' | 'status_changed' | 'comment' | 'field_changed' | 'assigned' | 'ai_execution' 等",
  })
  type: string;

  @ApiProperty({ type: String, description: '时间（ISO）' })
  timestamp: string;

  @ApiPropertyOptional({ type: String, description: '摘要', nullable: true })
  summary?: string | null;

  @ApiPropertyOptional({
    description: '详情（任意 JSON）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  detail?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    type: String,
    description: "'system' | 'user' | 'ai' | 'plugin:<id>'",
    nullable: true,
  })
  source?: string | null;

  @ApiPropertyOptional({
    description: '元数据（任意 JSON）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;
}

/** 导入结果（importTasks） */
export class IssueImportResponseDto {
  @ApiProperty({ type: Number, description: '成功导入条数' })
  imported: number;

  @ApiProperty({
    type: [IssueBaseDto],
    description: '新建的工单（无关系预加载）',
  })
  tasks: IssueBaseDto[];
}

/** 导出行（exportTasks JSON 格式） */
export class IssueExportRowDto {
  @ApiProperty({ type: String, description: '工单 ID' })
  id: string;

  @ApiProperty({ type: String, description: '标题' })
  title: string;

  @ApiPropertyOptional({ type: String, description: '描述', nullable: true })
  description?: string | null;

  @ApiProperty({ type: String, description: '状态' })
  status: string;

  @ApiProperty({ type: String, description: '优先级' })
  priority: string;

  @ApiPropertyOptional({
    type: String,
    description: '负责人 User ID',
    nullable: true,
  })
  assigneeId?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '负责人姓名',
    nullable: true,
  })
  assigneeName?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '报告人 User ID',
    nullable: true,
  })
  reporterId?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '报告人姓名',
    nullable: true,
  })
  reporterName?: string | null;

  @ApiPropertyOptional({ type: String, description: '迭代 ID', nullable: true })
  iterationId?: string | null;

  @ApiPropertyOptional({
    description: '开始日期（ISO）',
    type: String,
    nullable: true,
  })
  startDate?: string | null;

  @ApiPropertyOptional({
    description: '截止日期（ISO）',
    type: String,
    nullable: true,
  })
  dueDate?: string | null;

  @ApiPropertyOptional({
    type: Number,
    description: '预估工时（分钟）',
    nullable: true,
  })
  estimate?: number | null;

  @ApiProperty({ type: [String], description: '标签名列表' })
  tags: string[];

  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;
}

/** shortId 回填结果（backfillShortIds） */
export class ShortIdBackfillResponseDto {
  @ApiProperty({ type: Boolean, description: '是否全部成功' })
  success: boolean;

  @ApiProperty({ type: Number, description: '处理总数' })
  total: number;

  @ApiProperty({ type: Number, description: '成功数' })
  successCount: number;

  @ApiProperty({ type: Number, description: '失败数' })
  failed: number;

  @ApiProperty({ type: [String], description: '错误信息列表' })
  errors: string[];
}

/** shortId 统计（getShortIdStats） */
export class ShortIdStatsResponseDto {
  @ApiProperty({ type: Number, description: '工单总数' })
  total: number;

  @ApiProperty({ type: Number, description: '已有 shortId 的工单数' })
  withShortId: number;

  @ApiProperty({ type: Number, description: '缺少 shortId 的工单数' })
  withoutShortId: number;
}
