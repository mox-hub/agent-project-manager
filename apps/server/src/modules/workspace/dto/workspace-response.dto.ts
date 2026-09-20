import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
