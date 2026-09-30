import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { BackupScope } from './backup.dto';

/** 备份内单个文件（db 快照或注册表快照） */
export class WorkspaceBackupFileDto {
  @ApiProperty({
    description: '备份目录内文件名（如 ws-xxx.db / workspaces.json）',
  })
  name: string;

  @ApiProperty({ description: '文件字节数' })
  sizeBytes: number;

  @ApiProperty({
    enum: ['registry', 'database'],
    description: 'registry = 注册表快照；database = 工作区库快照',
  })
  kind: 'registry' | 'database';

  @ApiPropertyOptional({ description: 'kind=database 时的工作区 ID' })
  workspaceId?: string;
}

/** 单份备份（列表项 / 创建结果） */
export class WorkspaceBackupDto {
  @ApiProperty({ description: '备份 ID（即 .apm-backups 下的目录名）' })
  id: string;

  @ApiProperty({ description: '备份创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ enum: ['all', 'workspace'], description: '备份范围' })
  scope: BackupScope;

  @ApiPropertyOptional({ description: 'scope=workspace 时的目标工作区 ID' })
  workspaceId?: string;

  @ApiPropertyOptional({ description: 'scope=workspace 时的目标工作区名称' })
  workspaceName?: string;

  @ApiPropertyOptional({
    description:
      '产生原因（如 pre-restore = 恢复前强制自动备份）；常规备份无此字段',
  })
  reason?: string;

  @ApiProperty({ type: [WorkspaceBackupFileDto], description: '文件清单' })
  files: WorkspaceBackupFileDto[];

  @ApiProperty({ description: '全部文件字节总数' })
  totalBytes: number;
}

/** GET /workspaces/backups 响应（按创建时间倒序） */
export class WorkspaceBackupListResponseDto {
  @ApiProperty({
    type: [WorkspaceBackupDto],
    description: '备份列表（时间倒序）',
  })
  backups: WorkspaceBackupDto[];
}

/** 恢复结果 */
export class RestoreBackupResponseDto {
  @ApiProperty({ description: '被恢复的备份 ID' })
  restoredBackupId: string;

  @ApiProperty({ description: '恢复前自动备份的 ID（本次操作的回滚保险）' })
  preRestoreBackupId: string;

  @ApiProperty({
    type: [String],
    description: '实际覆盖的库对应工作区 ID 列表（含 default）',
  })
  restoredWorkspaces: string[];

  @ApiProperty({ description: '注册表快照是否已回写（仅 scope=all 为 true）' })
  registryRestored: boolean;
}
