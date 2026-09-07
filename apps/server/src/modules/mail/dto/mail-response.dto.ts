import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 邮件发件箱记录（MailOutbox） */
export class MailOutboxDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String, description: '收件人' })
  to: string;
  @ApiProperty({ type: String, description: '主题' })
  subject: string;
  @ApiProperty({ type: String, description: 'HTML 正文' })
  body: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '模板名（team_invite / register_invite ...）',
  })
  template?: string | null;
  @ApiPropertyOptional({
    description: '模板负载数据',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  payload?: Record<string, unknown> | null;
  @ApiProperty({ type: String, description: '状态：pending | sent | failed' })
  status: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '发送时间（ISO）',
  })
  sentAt?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '发送失败原因',
  })
  error?: string | null;
  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;
}

/** GET /admin/mail/status 返回 */
export class MailSmtpStatusDto {
  @ApiProperty({ type: Boolean, description: '是否已配置 SMTP' })
  smtpConfigured: boolean;
}
