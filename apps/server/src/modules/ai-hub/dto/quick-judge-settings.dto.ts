import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/** CAP-A-27 quick-judge 通道设置（advisory 判断通道的启停与通道指向） */
export class QuickJudgeSettingsResponseDto {
  @ApiProperty({ description: '是否启用 AI 快速判断通道（默认关）' })
  enabled!: boolean;

  @ApiProperty({ description: 'AIProviderConfig 槽位名（key 解密来源）' })
  provider!: string;

  @ApiProperty({ description: '判断模型固定版本号（忌 latest 别名漂移）' })
  model!: string;

  @ApiProperty({ description: 'System One 网关 base URL' })
  baseUrl!: string;

  @ApiProperty({ description: '单次判断超时（毫秒）' })
  timeoutMs!: number;
}

export class UpdateQuickJudgeSettingsDto {
  @ApiPropertyOptional({ description: '是否启用（缺省不改）' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'AIProviderConfig 槽位名（空串回落缺省）',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  provider?: string;

  @ApiPropertyOptional({ description: '判断模型版本（空串回落缺省）' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ description: '网关 base URL（空串回落缺省）' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  baseUrl?: string;
}
