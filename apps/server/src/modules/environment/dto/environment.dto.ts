/**
 * 本地基础环境检测 DTO（GET /environment）。
 *
 * 供首启引导「环境检查」步骤与诊断场景消费：Ordo 只检测+指引，不代装环境
 * （诚实化原则）。展示名与安装指引不在本契约——前端按 key 映射 i18n 双语文案，
 * 服务端只回确定性探测事实（installed/version/error）。
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiProperty({ description: '检测完成时间（ISO 8601）' })
  checkedAt!: string;
}
