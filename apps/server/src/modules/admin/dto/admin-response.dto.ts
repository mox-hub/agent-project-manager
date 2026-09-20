import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============ 账号管理 ============

/** 全局角色项 */
export class AdminRoleItemDto {
  @ApiProperty({ type: String, description: 'RoleAssignment ID' })
  id: string;

  @ApiProperty({ type: String, description: '角色名' })
  role: string;
}

/** GET /admin/users 列表项（含全局角色与关联 Member 投影） */
export class AdminUserListItemDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String }) username: string;
  @ApiProperty({ type: String }) displayName: string;
  @ApiPropertyOptional({ type: String, nullable: true, description: '邮箱' })
  email?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '头像 URL',
  })
  avatarUrl?: string | null;
  @ApiProperty({ type: Boolean, description: '是否启用' })
  isActive: boolean;
  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;
  @ApiProperty({ type: [AdminRoleItemDto], description: '全局角色列表' })
  roles: AdminRoleItemDto[];
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '关联 Member ID（无则为 null）',
  })
  memberId?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Member 状态',
  })
  memberStatus?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Member 短 ID',
  })
  memberShortId?: string | null;
}

/** POST /admin/users 返回（authService.createUserAccount） */
export class AdminUserCreateResponseDto {
  @ApiProperty({
    description: '账号摘要',
    type: Object,
    additionalProperties: true,
  })
  user: {
    id: string;
    username: string;
    displayName: string;
    email: string;
    avatarUrl: string | null;
    timezone: string | null;
    isActive: boolean;
  };

  @ApiProperty({ type: String, description: 'Member 镜像 ID' })
  memberId: string;

  @ApiProperty({ type: String, description: '随机初始密码（仅本次返回）' })
  generatedPassword: string;
}

/** PATCH /admin/users/:id 返回（账号摘要 + 重置密码时的新密码） */
export class AdminUserUpdateResponseDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String }) username: string;
  @ApiProperty({ type: String }) displayName: string;
  @ApiPropertyOptional({ type: String, nullable: true }) email?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) avatarUrl?:
    string | null;
  @ApiProperty({ type: Boolean }) isActive: boolean;
  @ApiPropertyOptional({
    type: String,
    description: '重置后的新密码（未重置为 undefined）',
    nullable: true,
  })
  generatedPassword?: string | null;
}

// ============ 注册邀请 ============

/** 注册邀请（RegistrationInvite；createInvite/revokeInvite 返回） */
export class RegistrationInviteDto {
  @ApiProperty({ type: String }) id: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '限定受邀邮箱（空为通用邀请）',
  })
  email?: string | null;
  @ApiProperty({ type: String, description: '邀请 token' })
  token: string;
  @ApiProperty({
    type: String,
    description: '状态：pending | accepted | revoked | expired',
  })
  status: string;
  @ApiProperty({ type: String, description: '过期时间（ISO）' })
  expiresAt: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '接受时间（ISO）',
  })
  acceptedAt?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '创建人 ID',
  })
  createdById?: string | null;
  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;
  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;
}

/** GET /admin/invites 列表项（含过期派生状态与创建人名） */
export class RegistrationInviteListItemDto extends RegistrationInviteDto {
  @ApiProperty({
    type: String,
    description: '派生状态（pending 且已过期 → expired）',
  })
  status: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '创建人显示名（无名则为 null）',
  })
  createdBy?: string | null;
}

/** GET /register-invites/:token 公开预览（@Public） */
export class RegisterInvitePreviewDto {
  @ApiProperty({ type: String, description: '邀请人显示名' })
  inviterName: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '受邀邮箱（通用邀请为 null）',
  })
  email?: string | null;

  @ApiProperty({
    type: String,
    description: '状态：pending | accepted | revoked | expired',
  })
  status: string;

  @ApiProperty({ type: String, description: '过期时间（ISO）' })
  expiresAt: string;
}
