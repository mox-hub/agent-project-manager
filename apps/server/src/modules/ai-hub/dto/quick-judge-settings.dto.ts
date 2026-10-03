import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
} from 'class-validator';

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

  @ApiProperty({
    description:
      '每场景介入开关（扩展批）：键=场景 ID，值仅认显式 false=用户禁用该介入点；未配置=true 均视为跟随总开关',
  })
  scenarios!: Record<string, boolean>;
}

export class UpdateQuickJudgeSettingsDto {
  @ApiPropertyOptional({ description: '是否启用（缺省不改）' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description:
      '每场景介入开关（增量合并：传键覆盖、未传键保留；仅布尔值键生效）',
  })
  @IsOptional()
  @IsObject()
  scenarios?: Record<string, boolean>;

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

/** 判定记录单条（AIUsageLog kind='judge' 的读侧投影） */
export class QuickJudgeLogItemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: '判断场景 ID' })
  scenario!: string;
  @ApiProperty({ description: '判定模型（响应回显版本）' })
  model!: string;
  @ApiProperty() provider!: string;
  @ApiProperty() promptTokens!: number;
  @ApiProperty() completionTokens!: number;
  @ApiProperty() totalTokens!: number;
  @ApiProperty({ description: '本次调用的问题数' })
  questions!: number;
  @ApiProperty({
    description:
      '答案摘要：问题 ID → { value, confidence }（noul/score 为数值，choice 为选项 ID）',
  })
  answers!: Record<
    string,
    { value: number | string | null; confidence: number | null }
  >;
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class QuickJudgeLogsResponseDto {
  @ApiProperty({ type: [QuickJudgeLogItemDto] })
  items!: QuickJudgeLogItemDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

export class ListQuickJudgeLogsQueryDto {
  @ApiPropertyOptional({ description: '按场景过滤' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  scenario?: string;

  @ApiPropertyOptional({ description: '页码（从 1 起）' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页条数（1-100）' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
