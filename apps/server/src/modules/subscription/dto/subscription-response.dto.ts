import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 订阅者投影（Member 头像栈/选人渲染） */
export class SubscriberDto {
  @ApiProperty({ type: String, description: '成员 ID' })
  memberId: string;

  @ApiProperty({ type: String, description: '显示名' })
  displayName: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '头像 URL',
  })
  avatarUrl?: string | null;

  @ApiProperty({
    type: String,
    description: '成员类型：human | ai_agent | external_agent',
  })
  type: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '关联用户 ID',
  })
  userId?: string | null;

  @ApiProperty({ type: String, description: '成员状态' })
  status: string;
}

/** GET /subscriptions 与 PUT /subscriptions 返回 */
export class SubscriptionListResponseDto {
  @ApiProperty({ type: [SubscriberDto], description: '订阅者列表' })
  items: SubscriberDto[];
}

/** GET /subscriptions/my 返回 */
export class MySubscriptionsResponseDto {
  @ApiPropertyOptional({
    type: String,
    description: '当前用户的 Member ID（未绑定为 null）',
    nullable: true,
  })
  memberId?: string | null;

  @ApiProperty({
    description: '已订阅的页面集合 [{ entityType, entityId }]',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        entityType: { type: 'string' },
        entityId: { type: 'string' },
      },
      required: ['entityType', 'entityId'],
    },
  })
  items: Array<{ entityType: string; entityId: string }>;
}
