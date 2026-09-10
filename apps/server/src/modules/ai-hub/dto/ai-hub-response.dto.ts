import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============ 会话 / 消息 ============

/** 助手消息气泡（chat 同步返回 / 会话详情消息） */
export class ChatMessageBriefDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String, description: '角色：user | assistant | system' })
  role: string;
  @ApiProperty({ type: String, description: '消息内容' })
  content: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '模型名（cli:<provider> / LLM 模型）',
  })
  modelName?: string | null;
}

/** POST /ai/chat 返回（sync 模式） */
export class ChatResponseDto {
  @ApiProperty({ type: String, description: '会话 ID' })
  conversationId: string;

  @ApiProperty({ type: String, description: '响应模式：sync' })
  mode: string;

  @ApiProperty({ type: ChatMessageBriefDto, description: '助手回复消息' })
  message: ChatMessageBriefDto;
}

/** 会话列表项（GET /ai/conversations data 项，含消息计数） */
export class AIConversationListItemDto {
  @ApiProperty({ type: String }) id: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '会话标题',
  })
  title?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '归属项目 ID',
  })
  projectId?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '关联任务 ID',
  })
  issueId?: string | null;
  @ApiPropertyOptional({
    description: '附加元数据',
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
    description: '消息计数（include _count.messages）',
    type: 'object',
    properties: {
      messages: { type: 'number' },
    },
    required: ['messages'],
  })
  _count: { messages: number };
}

/** GET /ai/conversations 返回（{ data, meta } 分页口径） */
export class ConversationListResponseDto {
  @ApiProperty({ type: [AIConversationListItemDto], description: '会话列表' })
  data: AIConversationListItemDto[];

  @ApiProperty({
    description: '分页元信息',
    type: 'object',
    properties: {
      page: { type: 'number' },
      pageSize: { type: 'number' },
      total: { type: 'number' },
      totalPages: { type: 'number' },
    },
    required: ['page', 'pageSize', 'total', 'totalPages'],
  })
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** 会话完整消息（GET /ai/conversations/:id include messages） */
export class AIMessageDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String, description: '会话 ID' })
  conversationId: string;
  @ApiProperty({ type: String, description: '角色：user | assistant | system' })
  role: string;
  @ApiProperty({ type: String, description: '内容' })
  content: string;
  @ApiPropertyOptional({ type: String, nullable: true, description: '模型名' })
  modelName?: string | null;
  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'tokens 消耗',
  })
  tokens?: number | null;
  @ApiPropertyOptional({
    description: '附加元数据（UIMessage chunks 等）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;
  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;
}

/** GET /ai/conversations/:id 返回 */
export class ConversationDetailResponseDto {
  @ApiProperty({ type: String }) id: string;
  @ApiPropertyOptional({ type: String, nullable: true }) projectId?:
    string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) issueId?:
    string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) title?: string | null;
  @ApiProperty({ type: String, description: '创建人用户 ID' })
  createdBy: string;
  @ApiPropertyOptional({
    description: '附加元数据',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;
  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;
  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;
  @ApiProperty({ type: [AIMessageDto], description: '消息列表（时间正序）' })
  messages: AIMessageDto[];
  @ApiPropertyOptional({
    description: '归属项目摘要 { id, name }',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  project?: { id: string; name: string } | null;
  @ApiPropertyOptional({
    description: '关联任务摘要 { id, title }',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  issue?: { id: string; title: string } | null;
}

/** 按模型聚合的用量 */
export class UsageByModelDto {
  @ApiProperty({ type: String, description: '模型名' })
  modelName: string;
  @ApiProperty({ type: Number, description: 'tokens 总量' })
  totalTokens: number;
  @ApiProperty({ type: Number, description: '估算成本（USD）' })
  totalCost: number;
}

/** 按日聚合的用量 */
export class UsageByDayDto {
  @ApiProperty({ type: String, description: '日期（YYYY-MM-DD）' })
  day: string;
  @ApiProperty({ type: Number, description: 'tokens 消耗' })
  totalTokens: number;
  @ApiProperty({ type: Number, description: '估算成本（USD）' })
  totalCost: number;
}

/** GET /ai/usage 返回 */
export class UsageResponseDto {
  @ApiProperty({ type: Number, description: 'tokens 总量' })
  totalTokens: number;

  @ApiProperty({ type: Number, description: '估算总成本（USD）' })
  totalCost: number;

  @ApiProperty({ type: [UsageByModelDto], description: '按模型聚合' })
  byModel: UsageByModelDto[];

  @ApiProperty({ type: [UsageByDayDto], description: '按日聚合（近 30 天）' })
  byDay: UsageByDayDto[];
}

/** GET /ai/models 列表项（AIModelConfig 或适配器派生模型） */
export class AIModelDto {
  @ApiProperty({
    type: String,
    description: '模型标识（配置为 id；适配器为 provider_model）',
  })
  id: string;
  @ApiProperty({ type: String, description: '模型名' })
  name: string;
  @ApiProperty({ type: String, description: '提供方' })
  provider: string;
  @ApiPropertyOptional({
    description: '适用任务类型列表',
    type: [String],
    nullable: true,
  })
  taskTypes?: Array<string> | null;
  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: '最大 tokens',
  })
  maxTokens?: number | null;
  @ApiProperty({ type: Boolean, description: '是否启用' })
  enabled: boolean;
}

/** POST /ai/providers/:id/detect-models 返回 */
export class DetectModelsResponseDto {
  @ApiProperty({ type: [String], description: '探测到的模型名列表' })
  models: string[];
}

/** DELETE /ai/providers/:id 返回 */
export class DeleteProviderResponseDto {
  @ApiProperty({ type: Boolean, description: '删除成功标记' })
  success: boolean;
}

// ============ AI Worker ============

/** POST /ai/assign-issue 返回（coordinator.assignTaskToAI） */
export class AssignIssueResponseDto {
  @ApiProperty({ type: String, description: '任务 ID' })
  issueId: string;

  @ApiPropertyOptional({ type: String, description: '创建/绑定的执行 ID' })
  executionRunId?: string;

  @ApiProperty({
    type: String,
    description: '结果状态：dispatched | assigned（派发失败降级）',
  })
  status: string;

  @ApiPropertyOptional({
    type: String,
    description: '审计黄牌警告（审计 red 不阻断）',
  })
  auditWarning?: string;

  @ApiPropertyOptional({ type: String, description: '派发失败原因' })
  dispatchError?: string;
}
