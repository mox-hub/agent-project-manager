import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Prisma Notification（JSON 序列化形态；channels 为 JSON 字符串数组） */
export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: '接收用户 ID' })
  userId: string;

  @ApiProperty({
    description: '事件类型（task.assigned / ci.build.failed 等）',
  })
  type: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  body: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  projectId: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  issueId: string | null;

  @ApiProperty({
    description: '通知渠道',
    type: [String],
    example: ['in-app'],
  })
  channels: string[];

  @ApiProperty({ description: '状态', enum: ['unread', 'read'] })
  status: string;

  @ApiPropertyOptional({
    description: '已读时间（ISO）',
    type: String,
    nullable: true,
  })
  readAt: string | null;

  @ApiPropertyOptional({
    description: '事件附加数据（JSON）',
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  payloadJson: unknown;

  @ApiPropertyOptional({
    description: '扩展元数据（JSON）',
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  metadata: unknown;

  @ApiProperty({ description: '创建时间（ISO）' })
  createdAt: string;
}

export class NotificationListMetaDto {
  @ApiProperty({ description: '当前页（从 1 起）' })
  page: number;

  @ApiProperty({ description: '每页条数（默认 20）' })
  pageSize: number;

  @ApiProperty({ description: '符合条件的总数' })
  total: number;
}

/** GET /notifications 返回：{ data, meta } */
export class NotificationListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data: NotificationResponseDto[];

  @ApiProperty({ type: NotificationListMetaDto })
  meta: NotificationListMetaDto;
}

/** GET /notifications/unread-count 返回 */
export class NotificationUnreadCountResponseDto {
  @ApiProperty({ description: '未读通知数' })
  count: number;
}

/**
 * Prisma NotificationPreference（channels 列为 String，存 JSON 串）：
 * GET 返回时已解析为数组；PUT 直接返回库内原始行（JSON 字符串）——用 oneOf 覆盖两种形态。
 */
export class NotificationPreferenceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional({
    description: '限定项目（null 为全局偏好）',
    type: String,
    nullable: true,
  })
  projectId: string | null;

  @ApiProperty({ description: '事件类型（支持 task.* 通配）' })
  eventType: string;

  @ApiProperty({
    description: '通知渠道：GET 返回解析后的数组；PUT 返回原始 JSON 字符串',
    oneOf: [{ type: 'array', items: { type: 'string' } }, { type: 'string' }],
    example: ['in-app'],
  })
  channels: string[] | string;

  @ApiPropertyOptional({ type: String, nullable: true })
  digestFrequency: string | null;

  @ApiPropertyOptional({
    description: '免打扰开始（HH:mm）',
    type: String,
    nullable: true,
  })
  quietHoursStart: string | null;

  @ApiPropertyOptional({
    description: '免打扰结束（HH:mm）',
    type: String,
    nullable: true,
  })
  quietHoursEnd: string | null;

  @ApiPropertyOptional({
    description: '免打扰 IANA 时区',
    type: String,
    nullable: true,
  })
  quietHoursTimezone: string | null;

  @ApiProperty({ description: '是否启用' })
  enabled: boolean;

  @ApiPropertyOptional({
    description: '扩展元数据（JSON）',
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  metadata: unknown;

  @ApiProperty({ description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ description: '更新时间（ISO）' })
  updatedAt: string;
}
