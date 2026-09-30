import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** 备份范围：all = 注册表 + 全部工作区库；workspace = 仅指定工作区库 */
export type BackupScope = 'all' | 'workspace';

/**
 * 创建备份请求。
 * scope=workspace 时 workspaceId 必填（服务端校验，因 class-validator
 * 的条件必填需 @ValidateIf 依赖自身字段之外的状态，写在服务层更直白）。
 */
export class CreateBackupDto {
  @ApiProperty({
    enum: ['all', 'workspace'],
    description:
      '备份范围：all = 全库（注册表 + 全部工作区库）；workspace = 单个工作区库',
  })
  @IsIn(['all', 'workspace'])
  scope: BackupScope;

  @ApiPropertyOptional({
    description:
      'scope=workspace 时必填：目标工作区 ID（default 表示默认工作区）',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  workspaceId?: string;
}

/** 恢复备份请求（强确认：confirm 必须精确匹配要求文案，见服务端说明） */
export class RestoreBackupDto {
  @ApiProperty({
    description:
      '强确认文案：scope=workspace 时必须精确等于该工作区名称；scope=all 时必须等于 "RESTORE ALL"',
    minLength: 1,
    maxLength: 80,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  confirm: string;
}
