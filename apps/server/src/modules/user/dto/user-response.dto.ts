import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 用户完整投影（GET /users、GET /users/:userId 返回） */
export class UserResponseDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String }) username: string;
  @ApiProperty({ type: String }) displayName: string;
  @ApiPropertyOptional({ type: String, nullable: true }) email?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) avatarUrl?:
    string | null;
  @ApiPropertyOptional({ type: String, nullable: true, description: '时区' })
  timezone?: string | null;
  @ApiProperty({ type: Boolean, description: '是否启用' })
  isActive: boolean;
  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;
}

/** 用户检索项（GET /users/search；比完整投影少 timezone/createdAt） */
export class UserSearchItemDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String }) username: string;
  @ApiProperty({ type: String }) displayName: string;
  @ApiPropertyOptional({ type: String, nullable: true }) email?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) avatarUrl?:
    string | null;
  @ApiProperty({ type: Boolean, description: '是否启用' })
  isActive: boolean;
}

/** 角色分配（RoleAssignment；GET/POST /users/:userId/roles 返回） */
export class RoleAssignmentDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String, description: '用户 ID' })
  userId: string;
  @ApiProperty({ type: String, description: '作用域类型：global | project' })
  scopeType: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '项目作用域 ID',
  })
  projectId?: string | null;
  @ApiProperty({ type: String, description: '角色名' })
  role: string;
  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;
}
