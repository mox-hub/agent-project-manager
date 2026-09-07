import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Prisma Member（JSON 序列化形态：DateTime → ISO string，Json 字段为任意 JSON） */
export class MemberResponseDto {
  @ApiProperty({ description: 'Member ID' })
  id: string;

  @ApiPropertyOptional({
    description: '关联登录用户 ID（AI 成员为 null）',
    type: String,
    nullable: true,
  })
  userId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  email?: string | null;

  @ApiPropertyOptional({
    description: '@ 句柄（唯一）',
    type: String,
    nullable: true,
  })
  handle?: string | null;

  @ApiProperty({ description: '唯一短 ID（路由兼容）' })
  shortId: string;

  @ApiProperty({ description: '显示名' })
  displayName: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  avatarUrl?: string | null;

  @ApiPropertyOptional({ description: '职务', type: String, nullable: true })
  title?: string | null;

  @ApiPropertyOptional({ description: '描述', type: String, nullable: true })
  description?: string | null;

  @ApiProperty({ description: '成员类型', enum: ['human', 'ai_agent'] })
  type: string;

  @ApiProperty({
    description: '状态',
    enum: ['active', 'inactive', 'suspended'],
  })
  status: string;

  @ApiPropertyOptional({
    description: '信任等级',
    type: Number,
    nullable: true,
  })
  trustLevel?: number | null;

  @ApiPropertyOptional({
    description: '信任分 0-100',
    type: Number,
    nullable: true,
  })
  trustScore?: number | null;

  @ApiPropertyOptional({
    description: '标签（JSON，通常为 string[]）',
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  tags?: unknown;

  @ApiPropertyOptional({
    description: '个人提示词（派发/聊天上下文注入）',
    type: String,
    nullable: true,
  })
  personalPrompt?: string | null;

  @ApiPropertyOptional({
    description: '思考强度 minimal|low|medium|high|max',
    type: String,
    nullable: true,
  })
  thinkingLevel?: string | null;

  @ApiPropertyOptional({
    description: '日费率（分，人天成本）',
    type: Number,
    nullable: true,
  })
  costRatePerDay?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  aiModelConfigId?: string | null;

  @ApiPropertyOptional({
    description: 'AI 员工级 CLI 覆盖',
    type: String,
    nullable: true,
  })
  defaultCliProviderId?: string | null;

  @ApiPropertyOptional({
    description: 'AI 员工默认执行角色',
    type: String,
    nullable: true,
  })
  defaultExecutionRole?: string | null;

  @ApiPropertyOptional({
    description: '扩展元数据（JSON 对象）',
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  metadata?: unknown;

  @ApiProperty({ description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ description: '更新时间（ISO）' })
  updatedAt: string;
}

/** memberService.list / 项目成员列表返回：{ data, total } */
export class MemberListResponseDto {
  @ApiProperty({ type: [MemberResponseDto] })
  data: MemberResponseDto[];

  @ApiProperty({ description: '符合条件的总数' })
  total: number;
}

/** 搜索/补全场景的成员摘要（member-search / mention suggest / assignee-watcher 内嵌） */
export class MemberSummaryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: '成员类型', enum: ['human', 'ai_agent'] })
  type: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  handle?: string | null;

  @ApiProperty()
  displayName: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  avatarUrl?: string | null;

  @ApiPropertyOptional({ description: '仅在成员搜索返回中存在' })
  status?: string;

  @ApiPropertyOptional({
    description: '仅在成员搜索返回中存在',
    type: String,
    nullable: true,
  })
  email?: string | null;
}

/** 成员任务负载（issue-assignee getMemberLoad / member card.load） */
export class MemberLoadResponseDto {
  @ApiProperty({ description: '待办任务数（todo/backlog）' })
  todo: number;

  @ApiProperty({ description: '进行中任务数（in_progress/pending_approval）' })
  inProgress: number;

  @ApiProperty({ description: '已完成任务数' })
  completed: number;

  @ApiProperty({ description: '合计' })
  total: number;
}

export class MemberCardAiModelDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  provider: string;
}

export class MemberCardProjectDto {
  @ApiProperty({ description: '项目 ID' })
  projectId: string;

  @ApiProperty({ description: '项目名' })
  projectName: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  color?: string | null;

  @ApiProperty({ description: '绑定角色' })
  role: string;
}

export class MemberCardActivityDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiPropertyOptional({
    description: '活动元数据（JSON）',
    type: 'object',
    additionalProperties: true,
  })
  detail?: unknown;

  @ApiProperty({ description: '发生时间（ISO）' })
  createdAt: string;
}

export class MemberCardTeamDto {
  @ApiProperty({ description: '团队 ID' })
  teamId: string;

  @ApiProperty({ description: '团队名' })
  teamName: string;

  @ApiProperty()
  role: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  color?: string | null;
}

/** member-card.service MemberCardDto（聚合卡片） */
export class MemberCardResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  shortId: string;

  @ApiProperty({ enum: ['human', 'ai_agent'] })
  type: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({ description: '@ 句柄（无则为空串）' })
  handle: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  email: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  avatarUrl: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  title: string | null;

  @ApiPropertyOptional({ description: '简介', type: String, nullable: true })
  bio: string | null;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional({ type: Number, nullable: true })
  trustLevel: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  trustScore: number | null;

  @ApiProperty({ description: '是否已配置个人提示词' })
  hasPersonalPrompt: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  thinkingLevel: string | null;

  @ApiProperty({ description: '是否在线（当前模型恒 false）' })
  isOnline: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  lastActiveAt: string | null;

  @ApiProperty({ description: '标签（归一化为 string[]）', type: [String] })
  tags: string[];

  @ApiPropertyOptional({ type: String, nullable: true })
  userId: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  phone: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  timezone: string | null;

  @ApiPropertyOptional({
    description: 'AI 模型信息（人类成员为 null）',
    type: MemberCardAiModelDto,
    nullable: true,
  })
  aiModel: MemberCardAiModelDto | null;

  @ApiProperty({ description: '能力标签（metadata 归一化）', type: [String] })
  capabilities: string[];

  @ApiProperty({ type: [MemberCardProjectDto] })
  projects: MemberCardProjectDto[];

  @ApiProperty({ type: MemberLoadResponseDto })
  load: MemberLoadResponseDto;

  @ApiProperty({ description: '最近 5 条活动', type: [MemberCardActivityDto] })
  recentActivities: MemberCardActivityDto[];

  @ApiProperty({ type: [MemberCardTeamDto] })
  teams: MemberCardTeamDto[];
}

export class MemberToolGrantResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  memberId: string;

  @ApiProperty({
    description: '授权范围',
    enum: ['cli_tool', 'mcp_server', 'skill'],
  })
  scope: string;

  @ApiProperty({
    description: '目标引用键（providerId / server id / skill key）',
  })
  refKey: string;

  @ApiProperty()
  granted: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  grantedBy: string | null;

  @ApiProperty({ description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ description: '更新时间（ISO）' })
  updatedAt: string;
}

export class ToolGrantCatalogItemDto {
  @ApiProperty({ description: '目录项引用键' })
  refKey: string;

  @ApiProperty({ description: '展示名' })
  label: string;

  @ApiProperty({ description: '目录项是否可用' })
  enabled: boolean;
}

export class ToolGrantCatalogDto {
  @ApiProperty({
    description: 'CLI provider 目录',
    type: [ToolGrantCatalogItemDto],
  })
  cli_tool: ToolGrantCatalogItemDto[];

  @ApiProperty({
    description: '外部 MCP server 目录',
    type: [ToolGrantCatalogItemDto],
  })
  mcp_server: ToolGrantCatalogItemDto[];

  @ApiProperty({ description: '技能目录', type: [ToolGrantCatalogItemDto] })
  skill: ToolGrantCatalogItemDto[];
}

/** GET /members/:id/tool-grants 返回：授权列表 + 可授权目录 */
export class MemberToolGrantsResponseDto {
  @ApiProperty({ type: [MemberToolGrantResponseDto] })
  grants: MemberToolGrantResponseDto[];

  @ApiProperty({ type: ToolGrantCatalogDto })
  catalog: ToolGrantCatalogDto;
}

export class MemberProjectBindingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  memberId: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty({ description: '绑定角色', example: 'member' })
  role: string;

  @ApiProperty({ description: '绑定来源', enum: ['direct', 'team'] })
  source: string;

  @ApiProperty({ description: '加入时间（ISO）' })
  joinedAt: string;
}

export class MemberProjectSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  color?: string | null;
}

/** GET /members/:id/projects 返回项：绑定 + 项目摘要（查无项目时 project 缺省） */
export class MemberProjectListItemDto extends MemberProjectBindingResponseDto {
  @ApiPropertyOptional({ type: MemberProjectSummaryDto })
  project?: MemberProjectSummaryDto;
}

/** DELETE /members/:id 返回 */
export class MemberDeleteResponseDto {
  @ApiProperty({ description: '删除成功' })
  ok: boolean;
}
