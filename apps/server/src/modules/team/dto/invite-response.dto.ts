import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** GET /invites/:token 返回（invite.service preview）：公开预览，不泄露成员明细 */
export class InvitePreviewResponseDto {
  @ApiProperty({ description: '团队名（未知团队为占位文案）' })
  teamName: string;

  @ApiPropertyOptional({
    description: '团队头像 URL',
    type: String,
    nullable: true,
  })
  teamAvatar: string | null;

  @ApiProperty({ description: '邀请人显示名（未知为占位文案）' })
  inviterName: string;

  @ApiProperty({ description: '受邀角色', example: 'member' })
  role: string;

  @ApiProperty({ description: '被邀邮箱' })
  email: string;

  @ApiProperty({
    description: '邀请状态（pending 且过期时返回 expired）',
    enum: ['pending', 'accepted', 'revoked', 'expired'],
  })
  status: string;

  @ApiProperty({ description: '过期时间（ISO）' })
  expiresAt: string;
}

/** POST /invites/:token/accept 返回 */
export class InviteAcceptResponseDto {
  @ApiProperty({ description: '加入的团队 ID' })
  teamId: string;

  @ApiProperty({ description: '当前用户对应的 Member ID' })
  memberId: string;

  @ApiProperty({ description: '团队角色' })
  role: string;
}
