import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 助手会话列表项（GET /ai/assistant/conversations） */
export class AssistantConversationListItemDto {
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
  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;
  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;
  @ApiProperty({ type: Number, description: '消息条数' })
  messageCount: number;
}

/** 助手消息（getCurrentConversation messages 项 / sendMessage 回执） */
export class AssistantMessageDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String, description: '角色：user | assistant | system' })
  role: string;
  @ApiProperty({ type: String, description: '内容' })
  content: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '模型名（cli:<provider> / LLM 模型）',
  })
  modelName?: string | null;
  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;
}

/** POST /ai/assistant/conversations 返回 */
export class AssistantCreateConversationResponseDto {
  @ApiProperty({ type: String, description: '新会话 ID' })
  conversationId: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '归属项目 ID',
  })
  projectId?: string | null;

  @ApiProperty({ description: '消息列表（新会话为空）' })
  messages: AssistantMessageDto[];
}

/** GET /ai/assistant/conversations/current 返回 */
export class AssistantCurrentConversationResponseDto {
  @ApiProperty({ type: String, description: '当前会话 ID' })
  conversationId: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '归属项目 ID',
  })
  projectId?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '会话记忆的模型选择（cli / cli:<providerId> / 模型名）',
    nullable: true,
  })
  model?: string | null;

  @ApiProperty({ type: [AssistantMessageDto], description: '最近消息' })
  messages: AssistantMessageDto[];
}

/**
 * POST /ai/assistant/messages 返回（sync 走 LLM 通道 / runtime 走 CLI 桥）。
 */
export class AssistantSendMessageResponseDto {
  @ApiProperty({ type: String, description: '会话 ID' })
  conversationId: string;

  @ApiProperty({
    type: String,
    description: '响应模式：sync（LLM）/ runtime（CLI 桥）',
  })
  mode: string;

  @ApiPropertyOptional({
    description: 'sync 模式：助手回复消息',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  message?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: String, description: 'runtime 模式：执行 ID' })
  executionRunId?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'runtime 模式：运行时节点 ID',
  })
  runtimeId?: string;

  @ApiPropertyOptional({ type: String, description: 'runtime 模式：派发状态' })
  status?: string;
}

/** POST /ai/assistant/dispatches 返回 */
export class AssistantDispatchResponseDto {
  @ApiProperty({ type: String, description: '执行 ID' })
  executionRunId: string;

  @ApiProperty({ type: String, description: '运行时节点 ID' })
  runtimeId: string;

  @ApiProperty({ type: String, description: '派发状态（初始 pending）' })
  status: string;
}

/** POST /ai/assistant/silent 返回（assistant-silent.service SilentRunResult） */
export class AssistantSilentResponseDto {
  @ApiProperty({ type: String, description: '场景名' })
  scenario: string;

  @ApiProperty({
    description: '场景结构化 JSON 结果（按 scenario 各自 schema）',
    type: Object,
    additionalProperties: true,
  })
  data: Record<string, unknown>;
}
