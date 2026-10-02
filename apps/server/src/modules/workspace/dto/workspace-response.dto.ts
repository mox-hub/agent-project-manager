import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/** 工作区注册表条目（workspace-registry.util WorkspaceRecord） */
export class WorkspaceRecordResponseDto {
  @ApiProperty({ description: '工作区 ID（default 为内置默认工作区）' })
  id: string;

  @ApiProperty({ description: '工作区名称' })
  name: string;

  @ApiProperty({
    description: '工作区根目录；default 工作区为 null',
    type: String,
    nullable: true,
  })
  path: string | null;

  @ApiPropertyOptional({ description: '是否默认工作区', type: Boolean })
  isDefault?: boolean;

  @ApiProperty({ description: '创建时间（ISO）' })
  createdAt: string;

  @ApiPropertyOptional({ description: '最近打开时间（ISO）', type: String })
  lastOpenedAt?: string;
}

export class WorkspaceListResponseDto {
  @ApiProperty({
    description: '工作区列表（始终含 default）',
    type: [WorkspaceRecordResponseDto],
  })
  workspaces: WorkspaceRecordResponseDto[];
}

export class WorkspaceCurrentResponseDto {
  @ApiProperty({
    description: '当前请求的工作区 ID（x-workspace-id 决定，缺省 default）',
  })
  workspaceId: string;
}

/**
 * 公开工作区条目（CAP-A-26）。
 * **脱敏**：只给 id 与名称；`path`（库/根目录）等注册表敏感字段**绝不暴露**给未认证方。
 */
export class PublicWorkspaceDto {
  @ApiProperty({ description: '工作区 ID（default 为内置默认工作区）' })
  id: string;

  @ApiProperty({ description: '工作区名称' })
  name: string;

  @ApiPropertyOptional({ description: '是否默认工作区', type: Boolean })
  isDefault?: boolean;
}

export class PublicWorkspaceListResponseDto {
  @ApiProperty({
    description:
      '是否向未认证方公开工作区名单（管理员开关，默认关；关闭时 workspaces 为空）',
  })
  enabled: boolean;

  @ApiProperty({
    description: '公开的工作区名单（enabled=false 时为空数组）',
    type: [PublicWorkspaceDto],
  })
  workspaces: PublicWorkspaceDto[];
}

export class SetPublicWorkspaceListDto {
  @ApiProperty({ description: '是否向未认证方公开工作区名单' })
  @IsBoolean()
  enabled: boolean;
}
