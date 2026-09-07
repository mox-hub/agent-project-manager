import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Prisma AccessToken（JSON 序列化形态；列表/吊销返回，不含 tokenHash） */
export class AccessTokenResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'Token 名称' })
  name: string;

  @ApiProperty({ description: 'Token 前缀（apm_pat_ + 6 位）' })
  tokenPrefix: string;

  @ApiProperty({ description: '所属用户 ID' })
  userId: string;

  @ApiPropertyOptional({
    description: '权限范围（预留）',
    type: [String],
    nullable: true,
  })
  scopes: string[] | null;

  @ApiPropertyOptional({
    description: '过期时间（ISO，永不过期为 null）',
    type: String,
    nullable: true,
  })
  expiresAt: string | null;

  @ApiPropertyOptional({
    description: '最近使用时间（ISO）',
    type: String,
    nullable: true,
  })
  lastUsedAt: string | null;

  @ApiPropertyOptional({
    description: '吊销时间（ISO，未吊销为 null）',
    type: String,
    nullable: true,
  })
  revokedAt: string | null;

  @ApiProperty({ description: '创建时间（ISO）' })
  createdAt: string;
}

/** POST auth/tokens 返回：完整 token 记录 + 明文 token（仅本次返回） */
export class AccessTokenCreatedResponseDto extends AccessTokenResponseDto {
  @ApiProperty({ description: '明文访问 token（仅创建响应返回一次）' })
  token: string;
}
