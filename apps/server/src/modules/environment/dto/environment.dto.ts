/**
 * 本地基础环境检测 DTO（GET /environment）+ 按需安装作业（CAP-A-30 环境自足）。
 *
 * 供首启引导「环境检查」步骤与诊断场景消费：Ordo 检测 + 按需代装（npm 系 AI CLI
 * 白名单首用安装，git/node 随包供给）；安装走受控 prefix 不碰系统全局。
 * 展示名与安装指引不在本契约——前端按 key 映射 i18n 双语文案，服务端只回
 * 确定性探测事实（installed/version/error）与可代装清单。
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const ENVIRONMENT_TOOL_KEYS = [
  'node',
  'git',
  'claude-code',
  'codex',
  'zcode',
  'opencode',
] as const;
export type EnvironmentToolKey = (typeof ENVIRONMENT_TOOL_KEYS)[number];

export class EnvironmentToolDto {
  @ApiProperty({ description: '工具键', enum: ENVIRONMENT_TOOL_KEYS })
  key!: EnvironmentToolKey;

  @ApiProperty({ description: '是否已安装（探测可用）' })
  installed!: boolean;

  @ApiPropertyOptional({
    description: '探测到的版本（原样输出）',
    nullable: true,
  })
  version?: string | null;

  @ApiPropertyOptional({
    description: '未安装/探测失败的原因（超时、命令不存在等）',
    nullable: true,
  })
  error?: string | null;
}

export class EnvironmentReportDto {
  @ApiProperty({
    description: '基础环境工具状态列表（node/git + 四个 AI CLI，顺序固定）',
    type: [EnvironmentToolDto],
  })
  tools!: EnvironmentToolDto[];

  @ApiProperty({
    description:
      '可一键代装的工具键（npm 白名单，CAP-A-30）；不在清单的工具只给手动指引',
    type: [String],
    enum: ENVIRONMENT_TOOL_KEYS,
  })
  installableTools!: EnvironmentToolKey[];

  @ApiProperty({ description: '检测完成时间（ISO 8601）' })
  checkedAt!: string;
}

export class EnvironmentInstallRequestDto {
  @ApiProperty({ description: '要安装的工具键', enum: ENVIRONMENT_TOOL_KEYS })
  @IsIn(ENVIRONMENT_TOOL_KEYS as unknown as string[])
  tool!: EnvironmentToolKey;
}

export class EnvironmentInstallJobDto {
  @ApiProperty({ description: '作业 ID' })
  jobId!: string;

  @ApiProperty({ description: '工具键', enum: ENVIRONMENT_TOOL_KEYS })
  tool!: EnvironmentToolKey;

  @ApiProperty({ description: 'npm 包名（服务端白名单解析）' })
  package!: string;

  @ApiProperty({
    description: '作业状态',
    enum: ['running', 'succeeded', 'failed'],
  })
  status!: 'running' | 'succeeded' | 'failed';

  @ApiProperty({ description: '开始时间（ISO 8601）' })
  startedAt!: string;

  @ApiPropertyOptional({ description: '结束时间（ISO 8601）', nullable: true })
  finishedAt?: string | null;

  @ApiPropertyOptional({
    description: '退出码（未结束时 null）',
    nullable: true,
  })
  exitCode?: number | null;

  @ApiPropertyOptional({ description: '失败原因', nullable: true })
  error?: string | null;

  @ApiProperty({ description: '安装日志尾部（截断）' })
  log!: string;
}
