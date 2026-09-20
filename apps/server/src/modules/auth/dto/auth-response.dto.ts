import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 登录态返回的会话信息 */
export class LoginSessionDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String, description: '过期时间（ISO）' })
  expiresAt: string;
}

/** 登录态 / 当前用户接口返回的 user 子对象 */
export class AuthUserDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  username: string;

  @ApiProperty({ type: String })
  displayName: string;

  @ApiProperty({ type: String })
  email: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  avatarUrl: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  timezone: string | null;
}

/** 主体权限画像（全局角色 + 项目角色映射） */
export class PermissionProfileDto {
  @ApiProperty({ type: [String], description: '全局角色名列表' })
  globalRoles: string[];

  @ApiProperty({
    description: '项目 ID → 该项目角色名列表',
    type: Object,
    additionalProperties: { type: 'array', items: { type: 'string' } },
  })
  projectRoles: Record<string, string[]>;
}

/** 主体声明（SubjectClaim 快照；登录态含 snapshotId，GET subject-claim 不含） */
export class SubjectClaimResponseDto {
  @ApiPropertyOptional({
    type: String,
    description: '快照 ID（登录/注册返回时存在）',
  })
  snapshotId?: string;

  @ApiProperty({ enum: ['human_member'] })
  subjectType: string;

  @ApiProperty({ type: String, description: '主体 ID（User ID）' })
  subjectId: string;

  @ApiProperty({
    description: '身份来源',
    enum: ['local', 'oauth2', 'cli', 'mcp', 'api', 'plugin'],
  })
  identitySource: string;

  @ApiProperty({ type: [String], description: '有角色的项目 ID 列表' })
  projectScopes: string[];

  @ApiProperty({ type: PermissionProfileDto })
  permissionProfile: PermissionProfileDto;

  @ApiProperty({ type: String, description: '签发时间（ISO）' })
  issuedAt: string;

  @ApiProperty({ type: String, description: '过期时间（ISO）' })
  expiresAt: string;
}

/** 注册 / 登录 / OAuth2 回调成功后的登录态 */
export class LoginResponseDto {
  @ApiProperty({ type: String, description: 'JWT 访问令牌' })
  accessToken: string;

  @ApiProperty({ type: LoginSessionDto })
  session: LoginSessionDto;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;

  @ApiProperty({ type: SubjectClaimResponseDto })
  subjectClaim: SubjectClaimResponseDto;
}

/** 角色分配（GET me 返回） */
export class RoleAssignmentDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ description: '作用域类型', enum: ['global', 'project'] })
  scopeType: string;

  @ApiPropertyOptional({
    description: '项目 ID（global 作用域为 null）',
    type: String,
    nullable: true,
  })
  projectId: string | null;

  @ApiProperty({ type: String })
  role: string;
}

/** GET / PATCH auth/me 返回 */
export class CurrentUserResponseDto {
  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;

  @ApiProperty({ type: [RoleAssignmentDto] })
  roles: RoleAssignmentDto[];

  @ApiProperty({ type: SubjectClaimResponseDto })
  subjectClaim: SubjectClaimResponseDto;
}

/** POST auth/logout 返回 */
export class LogoutResponseDto {
  @ApiProperty({ description: '登出作用域', enum: ['all', 'current', 'none'] })
  scope: string;

  @ApiPropertyOptional({
    description: '吊销会话数（scope=all 时缺省）',
    type: Number,
  })
  revokedCount?: number;
}

/** PATCH auth/me/password 返回 */
export class ChangePasswordResponseDto {
  @ApiProperty({ type: Boolean, example: true })
  ok: boolean;
}

/** GET auth/public-config 返回 */
export class PublicConfigResponseDto {
  @ApiProperty({
    type: String,
    description: '部署模式（standalone=本地直邀可用）',
  })
  appMode: string;

  @ApiProperty({ type: String, description: '注册策略（open / invite）' })
  registrationMode: string;
}

/** GET auth/sessions 返回的会话行 */
export class AuthSessionDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ type: String, description: '过期时间（ISO）' })
  expiresAt: string;

  @ApiProperty({ type: String, description: '最近活跃时间（ISO）' })
  lastActiveAt: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  ipAddress: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  userAgent: string | null;

  @ApiPropertyOptional({
    description: '会话元数据（JSON，含 identitySource / providerId）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata: unknown;
}
